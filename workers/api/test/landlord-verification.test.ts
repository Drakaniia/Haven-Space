import { describe, expect, it } from 'bun:test';
import { Database } from 'bun:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Env, UploadThingDeleteFiles, UploadThingUploadFiles } from '../src/env';
import app from '../src/index';

function runMigrations(db: Database): void {
  const migrationDir = join(import.meta.dir, '..', 'migrations');
  const migrationNames = readdirSync(migrationDir)
    // Skip seed migrations (demo data) — tests build their own fixtures.
    .filter(name => name.endsWith('.sql') && !name.includes('seed'))
    .sort();

  for (const name of migrationNames) {
    db.exec(readFileSync(join(migrationDir, name), 'utf8'));
  }
}

function createSqliteD1(db: Database): D1Database {
  return {
    prepare: (sql: string) =>
      ({
        bind: (...values: unknown[]) => {
          const statement = db.prepare(sql);

          return {
            first: async <T>() => (statement.get(...values) ?? null) as T | null,
            all: async <T>() => ({ results: statement.all(...values) as T[] }),
            run: async () => {
              const result = statement.run(...values);

              return {
                success: true,
                meta: {
                  last_row_id: Number(result.lastInsertRowid ?? 0),
                  changes: Number(result.changes ?? 0),
                },
                results: [],
              };
            },
          };
        },
      } as unknown as D1PreparedStatement),
  } as unknown as D1Database;
}

const uploadedBatches: { names: string[]; metadata?: Record<string, unknown> }[] = [];
const deletedKeys: string[][] = [];

function createEnv(db: Database, deleted: string[][] = []): Env {
  const uploadFiles: UploadThingUploadFiles = async (files, metadata) => {
    uploadedBatches.push({ names: files.map(file => file.name), metadata });

    return files.map(file => ({
      data: {
        key: `key-${file.name}`,
        name: file.name,
        size: file.size,
        ufsUrl: `https://utfs.io/f/key-${file.name}`,
      },
      error: null,
    }));
  };
  const deleteFiles: UploadThingDeleteFiles = async keys => {
    deleted.push(keys);
  };

  return {
    APP_ENV: 'test',
    APP_ORIGIN: 'http://localhost:4173',
    JWT_SECRET: 'test-secret',
    DB: createSqliteD1(db),
    UPLOADTHING_TOKEN: 'test-token',
    UPLOADTHING_UPLOAD_FILES: uploadFiles,
    UPLOADTHING_DELETE_FILES: deleteFiles,
  };
}

function seedUsers(db: Database): void {
  db.exec(`
    INSERT INTO users (id, first_name, last_name, email, role, is_verified, email_verified, account_status)
    VALUES
      (1, 'Ada', 'Admin', 'admin@example.com', 'admin', 1, 1, 'active'),
      (2, 'Benny', 'Boarder', 'boarder@example.com', 'boarder', 1, 1, 'active'),
      (3, 'Lara', 'Landlord', 'landlord@example.com', 'landlord', 0, 1, 'pending_verification');
  `);
}

function seedDocuments(db: Database, userId = 3): void {
  for (const documentType of [
    'government_id',
    'proof_of_ownership',
    'business_permit',
    'selfie_with_id',
  ]) {
    db.prepare(
      `
        INSERT INTO landlord_verification_documents (user_id, document_type, file_url, file_name)
        VALUES (?, ?, ?, ?)
      `
    ).run(userId, documentType, `https://utfs.io/f/${documentType}-key`, `${documentType}.jpg`);
  }
}

function uploadForm(
  documentType: string,
  fileName: string,
  options: { type?: string; size?: number } = {}
): FormData {
  const form = new FormData();
  form.append('document_type', documentType);
  form.append(
    'file',
    new File([new Uint8Array(options.size ?? 10)], fileName, {
      type: options.type ?? 'image/jpeg',
    })
  );

  return form;
}

async function upload(
  env: Env,
  documentType: string,
  fileName: string,
  options: { type?: string; size?: number; userId?: string } = {}
): Promise<Response> {
  return app.request(
    'http://localhost/api/landlord/verification/documents',
    {
      method: 'POST',
      headers: { 'X-User-ID': options.userId ?? '3' },
      body: uploadForm(documentType, fileName, options),
    },
    env
  );
}

interface VerificationResponse {
  data: {
    verification_status: string;
    note: string | null;
    reviewed_at: string | null;
    documents_complete: boolean;
    missing_documents: string[];
    documents: Array<{
      document_type: string;
      label: string;
      submitted: boolean;
      file_name: string | null;
    }>;
  };
}

describe('landlord verification document routes', () => {
  it('returns all four slots in fixed order with placeholders for missing files', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    seedUsers(sqlite);
    const env = createEnv(sqlite);

    const response = await app.request(
      'http://localhost/api/landlord/verification',
      { headers: { 'X-User-ID': '3' } },
      env
    );
    const body = (await response.json()) as VerificationResponse;

    expect(response.status).toBe(200);
    expect(body.data.verification_status).toBe('pending');
    expect(body.data.documents_complete).toBe(false);
    expect(body.data.documents.map(document => document.document_type)).toEqual([
      'government_id',
      'proof_of_ownership',
      'business_permit',
      'selfie_with_id',
    ]);
    expect(body.data.documents.map(document => document.label)).toEqual([
      'Valid government ID',
      'Proof of property ownership',
      'Business permit',
      'Selfie holding the ID',
    ]);
    expect(body.data.documents.every(document => document.submitted === false)).toBe(true);
    expect(body.data.missing_documents).toHaveLength(4);
  });

  it('uploads a document and reports the slot as submitted', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    seedUsers(sqlite);
    const env = createEnv(sqlite);

    const response = await upload(env, 'government_id', 'id-front.jpg');
    const body = (await response.json()) as {
      message: string;
      data: { document_type: string; file_url: string; verification_status: string };
    };

    expect(response.status).toBe(200);
    expect(body.message).toBe('Document uploaded successfully');
    expect(body.data).toEqual(
      expect.objectContaining({
        document_type: 'government_id',
        file_url: 'https://utfs.io/f/key-id-front.jpg',
        verification_status: 'pending',
      })
    );
    expect(
      sqlite
        .prepare(
          `
            SELECT file_name, file_type, file_size, deleted_at
            FROM landlord_verification_documents
            WHERE user_id = 3 AND document_type = 'government_id'
          `
        )
        .get()
    ).toEqual({
      file_name: 'id-front.jpg',
      file_type: 'image/jpeg',
      file_size: 10,
      deleted_at: null,
    });

    const state = await app.request(
      'http://localhost/api/landlord/verification',
      { headers: { 'X-User-ID': '3' } },
      env
    );
    const stateBody = (await state.json()) as VerificationResponse;

    expect(stateBody.data.documents[0]).toEqual(
      expect.objectContaining({ document_type: 'government_id', submitted: true })
    );
    expect(stateBody.data.missing_documents).toEqual([
      'proof_of_ownership',
      'business_permit',
      'selfie_with_id',
    ]);
  });

  it('rejects oversized files and PDFs in image-only slots', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    seedUsers(sqlite);
    const env = createEnv(sqlite);

    const oversized = await upload(env, 'government_id', 'big.jpg', {
      size: 5 * 1024 * 1024 + 1,
    });

    expect(oversized.status).toBe(400);
    expect(await oversized.json()).toEqual({ error: 'File size must be less than 5MB' });

    const pdfId = await upload(env, 'government_id', 'id.pdf', { type: 'application/pdf' });

    expect(pdfId.status).toBe(400);
    expect(await pdfId.json()).toEqual({
      error: 'Invalid file type. Only JPEG, PNG and WebP are allowed',
    });

    const pdfPermit = await upload(env, 'business_permit', 'permit.pdf', {
      type: 'application/pdf',
    });

    expect(pdfPermit.status).toBe(200);
  });

  it('rejects invalid document types, missing files and non-landlord callers', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    seedUsers(sqlite);
    const env = createEnv(sqlite);

    const invalidType = await upload(env, 'passport_scan', 'passport.jpg');

    expect(invalidType.status).toBe(400);
    expect(await invalidType.json()).toEqual({ error: 'Invalid document type' });

    const missingFileForm = new FormData();
    missingFileForm.append('document_type', 'government_id');
    const missingFile = await app.request(
      'http://localhost/api/landlord/verification/documents',
      { method: 'POST', headers: { 'X-User-ID': '3' }, body: missingFileForm },
      env
    );

    expect(missingFile.status).toBe(400);
    expect(await missingFile.json()).toEqual({ error: 'No valid file uploaded' });

    const boarder = await upload(env, 'government_id', 'id.jpg', { userId: '2' });

    expect(boarder.status).toBe(403);
  });

  it('keeps one live file per slot and deletes the replaced UploadThing file', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    seedUsers(sqlite);
    const deleted: string[][] = [];
    const env = createEnv(sqlite, deleted);

    await upload(env, 'government_id', 'id-first.jpg');
    await upload(env, 'government_id', 'id-second.jpg');

    const live = sqlite
      .prepare(
        `
          SELECT file_name FROM landlord_verification_documents
          WHERE user_id = 3 AND document_type = 'government_id' AND deleted_at IS NULL
        `
      )
      .all() as Array<{ file_name: string }>;

    expect(live).toEqual([{ file_name: 'id-second.jpg' }]);
    expect(deleted).toEqual([['key-id-first.jpg']]);
  });

  it('submits the bundle only once every slot holds a file', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    seedUsers(sqlite);
    const env = createEnv(sqlite);

    await upload(env, 'government_id', 'id.jpg');
    await upload(env, 'proof_of_ownership', 'deed.jpg');
    await upload(env, 'business_permit', 'permit.jpg');

    const blocked = await app.request(
      'http://localhost/api/landlord/verification/submit',
      { method: 'POST', headers: { 'X-User-ID': '3' } },
      env
    );

    expect(blocked.status).toBe(400);
    expect(await blocked.json()).toEqual({
      error: 'Missing documents: Selfie holding the ID',
    });

    await upload(env, 'selfie_with_id', 'selfie.jpg');

    const submitted = await app.request(
      'http://localhost/api/landlord/verification/submit',
      { method: 'POST', headers: { 'X-User-ID': '3' } },
      env
    );

    expect(submitted.status).toBe(200);
    expect(await submitted.json()).toEqual({ message: 'Documents submitted for review' });
    expect(
      sqlite.prepare('SELECT verification_status FROM landlord_profiles WHERE user_id = 3').get()
    ).toEqual({ verification_status: 'submitted' });
  });

  it('removes a document and returns the bundle to pending', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    seedUsers(sqlite);
    const deleted: string[][] = [];
    const env = createEnv(sqlite, deleted);

    await upload(env, 'government_id', 'id.jpg');
    await app.request(
      'http://localhost/api/landlord/verification/submit',
      { method: 'POST', headers: { 'X-User-ID': '3' } },
      env
    );

    const missing = await app.request(
      'http://localhost/api/landlord/verification/documents/business_permit',
      { method: 'DELETE', headers: { 'X-User-ID': '3' } },
      env
    );

    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ error: 'Document not found' });

    const removed = await app.request(
      'http://localhost/api/landlord/verification/documents/government_id',
      { method: 'DELETE', headers: { 'X-User-ID': '3' } },
      env
    );
    const removedBody = (await removed.json()) as {
      message: string;
      data: { verification_status: string };
    };

    expect(removed.status).toBe(200);
    expect(removedBody.message).toBe('Document removed');
    expect(removedBody.data.verification_status).toBe('pending');
    expect(deleted).toEqual([['key-id.jpg']]);
  });
});

describe('admin landlord verification review', () => {
  it('returns the document bundle with the landlord detail', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    seedUsers(sqlite);
    seedDocuments(sqlite, 3);
    sqlite
      .prepare(
        "DELETE FROM landlord_verification_documents WHERE document_type = 'business_permit'"
      )
      .run();
    const env = createEnv(sqlite);

    const response = await app.request(
      'http://localhost/api/admin/landlords?id=3',
      { headers: { 'X-User-ID': '1' } },
      env
    );
    const body = (await response.json()) as {
      data: {
        documents_complete: boolean;
        missing_documents: string[];
        documents: Array<{ document_type: string; file_name: string; file_url: string }>;
      };
    };

    expect(response.status).toBe(200);
    expect(body.data.documents_complete).toBe(false);
    expect(body.data.missing_documents).toEqual(['business_permit']);
    expect(body.data.documents).toEqual([
      expect.objectContaining({
        document_type: 'government_id',
        file_name: 'government_id.jpg',
        file_url: 'https://utfs.io/f/government_id-key',
      }),
      expect.objectContaining({ document_type: 'proof_of_ownership' }),
      expect.objectContaining({ document_type: 'selfie_with_id' }),
    ]);
  });

  it('refuses to approve a landlord with an incomplete bundle', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    seedUsers(sqlite);
    seedDocuments(sqlite, 3);
    sqlite
      .prepare("DELETE FROM landlord_verification_documents WHERE document_type = 'selfie_with_id'")
      .run();
    const env = createEnv(sqlite);

    const response = await app.request(
      'http://localhost/api/admin/landlords',
      {
        method: 'POST',
        headers: { 'X-User-ID': '1', 'Content-Type': 'application/json' },
        body: JSON.stringify({ landlordId: 3, action: 'approve' }),
      },
      env
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: 'All four verification documents are required before approval',
    });
    expect(sqlite.prepare('SELECT is_verified FROM users WHERE id = 3').get()).toEqual({
      is_verified: 0,
    });
  });

  it('approves a complete bundle, notifying the landlord and recording the audit trail', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    seedUsers(sqlite);
    seedDocuments(sqlite, 3);
    const env = createEnv(sqlite);

    const response = await app.request(
      'http://localhost/api/admin/landlords',
      {
        method: 'POST',
        headers: { 'X-User-ID': '1', 'Content-Type': 'application/json' },
        body: JSON.stringify({ landlordId: 3, action: 'approve' }),
      },
      env
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      message: 'Landlord verification updated successfully',
    });
    expect(
      sqlite.prepare('SELECT is_verified, account_status FROM users WHERE id = 3').get()
    ).toEqual({ is_verified: 1, account_status: 'active' });
    expect(
      sqlite
        .prepare(
          'SELECT verification_status, verification_reviewed_by FROM landlord_profiles WHERE user_id = 3'
        )
        .get()
    ).toEqual({ verification_status: 'approved', verification_reviewed_by: 1 });
    expect(sqlite.prepare('SELECT type FROM notifications WHERE user_id = 3').get()).toEqual({
      type: 'landlord_verification_approved',
    });
    expect(
      sqlite
        .prepare(
          "SELECT entity, action, ids_json FROM admin_audit_log WHERE entity = 'landlord_verification'"
        )
        .get()
    ).toEqual({ entity: 'landlord_verification', action: 'approve', ids_json: '[3]' });
  });

  it('rejects with a reason the landlord can read back', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    seedUsers(sqlite);
    seedDocuments(sqlite, 3);
    const env = createEnv(sqlite);

    const response = await app.request(
      'http://localhost/api/admin/landlords',
      {
        method: 'POST',
        headers: { 'X-User-ID': '1', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          landlordId: 3,
          action: 'reject',
          reason: 'The business permit photo is blurry.',
        }),
      },
      env
    );

    expect(response.status).toBe(200);

    const state = await app.request(
      'http://localhost/api/landlord/verification',
      { headers: { 'X-User-ID': '3' } },
      env
    );
    const stateBody = (await state.json()) as VerificationResponse;

    expect(stateBody.data.verification_status).toBe('rejected');
    expect(stateBody.data.note).toBe('The business permit photo is blurry.');
    expect(sqlite.prepare('SELECT type FROM notifications WHERE user_id = 3').get()).toEqual({
      type: 'landlord_verification_rejected',
    });
  });

  it('requests documents without changing the bundle status', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    seedUsers(sqlite);
    const env = createEnv(sqlite);

    const response = await app.request(
      'http://localhost/api/admin/landlords',
      {
        method: 'POST',
        headers: { 'X-User-ID': '1', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          landlordId: 3,
          action: 'request_documents',
          reason: 'Please upload a clearer ID photo.',
        }),
      },
      env
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ message: 'Verification documents requested' });
    expect(
      sqlite
        .prepare(
          'SELECT verification_status, verification_note FROM landlord_profiles WHERE user_id = 3'
        )
        .get()
    ).toEqual({
      verification_status: 'pending',
      verification_note: 'Please upload a clearer ID photo.',
    });
    expect(sqlite.prepare('SELECT is_verified FROM users WHERE id = 3').get()).toEqual({
      is_verified: 0,
    });
    expect(sqlite.prepare('SELECT type FROM notifications WHERE user_id = 3').get()).toEqual({
      type: 'landlord_verification_documents_requested',
    });
  });

  it('rejects an unknown action and non-admin callers', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    seedUsers(sqlite);
    seedDocuments(sqlite, 3);
    const env = createEnv(sqlite);

    const unknown = await app.request(
      'http://localhost/api/admin/landlords',
      {
        method: 'POST',
        headers: { 'X-User-ID': '1', 'Content-Type': 'application/json' },
        body: JSON.stringify({ landlordId: 3, action: 'escalate' }),
      },
      env
    );

    expect(unknown.status).toBe(400);
    expect(await unknown.json()).toEqual({
      error: 'Invalid action. Use approve, reject or request_documents',
    });

    const asLandlord = await app.request(
      'http://localhost/api/admin/landlords?id=3',
      { headers: { 'X-User-ID': '3' } },
      env
    );

    expect(asLandlord.status).toBe(403);
    expect(await asLandlord.json()).toEqual({ error: 'Access denied. Admins only.' });
  });

  it('includes the landlord id on admin application rows', async () => {
    const sqlite = new Database(':memory:');
    runMigrations(sqlite);
    seedUsers(sqlite);
    sqlite.exec(`
      INSERT INTO properties (id, landlord_id, title, price, listing_moderation_status, status)
      VALUES (10, 3, 'Lara Boarding House', 4500, 'published', 'available');

      INSERT INTO rooms (id, property_id, landlord_id, title, price, status)
      VALUES (100, 10, 3, 'Single Room 1', 4500, 'available');

      INSERT INTO applications (id, boarder_id, landlord_id, room_id, message, status)
      VALUES (200, 2, 3, 100, 'I want this room.', 'pending');
    `);
    const env = createEnv(sqlite);

    const response = await app.request(
      'http://localhost/api/admin/applications',
      { headers: { 'X-User-ID': '1' } },
      env
    );
    const body = (await response.json()) as {
      data: { applications: Array<{ id: number; landlord_id: number; landlord_last: string }> };
    };

    expect(response.status).toBe(200);
    expect(body.data.applications[0]).toEqual(
      expect.objectContaining({ id: 200, landlord_id: 3, landlord_last: 'Landlord' })
    );
  });
});
