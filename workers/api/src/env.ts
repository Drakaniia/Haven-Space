export interface Env {
  APP_ENV?: string;
  APP_DEBUG?: string;
  APP_ORIGIN?: string;
  APP_BASE_URL?: string;
  ALLOWED_ORIGINS?: string;
  JWT_SECRET?: string;
  JWT_EXPIRATION?: string;
  REFRESH_TOKEN_EXPIRATION?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REDIRECT_URI?: string;
  UPLOADTHING_TOKEN?: string;
  GEMINI_API_KEY?: string;
  DB?: D1Database;
  UPLOADTHING_UPLOAD_FILES?: UploadThingUploadFiles;
  UPLOADTHING_DELETE_FILES?: UploadThingDeleteFiles;
}

export interface UploadThingUploadedFile {
  key: string;
  url?: string;
  appUrl?: string;
  ufsUrl?: string;
  name?: string;
  size?: number;
}

export interface UploadThingUploadResult {
  data: UploadThingUploadedFile | null;
  error: { message?: string; code?: string } | null;
}

export type UploadThingUploadFiles = (
  files: File[],
  metadata?: Record<string, unknown>
) => Promise<UploadThingUploadResult[]>;

export type UploadThingDeleteFiles = (keys: string[]) => Promise<void>;
