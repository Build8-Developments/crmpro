export interface UploadFileParams {
  key: string;
  buffer: Buffer;
  contentType: string;
  metadata?: Record<string, string>;
}

export interface UploadFileResult {
  key: string;
  bucket: string;
}

export interface SignedUploadUrlParams {
  key: string;
  contentType: string;
  expiresInSeconds?: number;
}

export interface SignedDownloadUrlParams {
  objectKey: string;
  expiresInSeconds?: number;
}

export interface SignedUrlResult {
  url: string;
  key: string;
  expiresInSeconds: number;
}

export interface HeadObjectResult {
  contentLength: number;
  contentType?: string;
}
