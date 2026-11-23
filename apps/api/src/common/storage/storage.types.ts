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
  /**
   * `inline` lets the browser render it (previews); `attachment` forces a
   * download. Omitted = the object's stored headers.
   */
  disposition?: 'inline' | 'attachment';
  /** Suggested filename for `attachment`. */
  fileName?: string;
  /** Override the Content-Type the browser sees (e.g. force text/plain). */
  contentType?: string;
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

export interface ListObjectKeysParams {
  prefix?: string;
  continuationToken?: string;
  maxKeys?: number;
}

export interface ListObjectKeysResult {
  keys: string[];
  nextContinuationToken?: string;
}
