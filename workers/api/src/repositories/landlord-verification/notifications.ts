export async function createLandlordVerificationNotification(
  db: D1Database,
  input: {
    landlordId: number;
    landlordName: string;
    decision: 'approved' | 'rejected' | 'request_documents';
    reason?: string | null;
  }
): Promise<void> {
  const templates = {
    approved: {
      type: 'landlord_verification_approved',
      title: 'Verification approved',
      message: `Your account verification was approved, ${input.landlordName}. You can now manage your listings.`,
    },
    rejected: {
      type: 'landlord_verification_rejected',
      title: 'Verification rejected',
      message: input.reason
        ? `Your verification documents were rejected: ${input.reason}`
        : 'Your verification documents were rejected. Please upload new documents.',
    },
    request_documents: {
      type: 'landlord_verification_documents_requested',
      title: 'Documents requested',
      message: input.reason
        ? `An admin is asking for verification documents: ${input.reason}`
        : 'An admin is asking you to upload your verification documents.',
    },
  } as const;
  const template = templates[input.decision];

  await db
    .prepare(
      `
        INSERT INTO notifications (user_id, type, title, message, metadata)
        VALUES (?, ?, ?, ?, ?)
      `
    )
    .bind(
      input.landlordId,
      template.type,
      template.title,
      template.message,
      JSON.stringify({
        landlord_id: input.landlordId,
        decision: input.decision,
        reason: input.reason ?? null,
      })
    )
    .run();
}
