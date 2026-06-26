import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  SignedDownloadUrlParams,
  SignedUploadUrlParams,
  SignedUrlResult,
  UploadFileParams,
  UploadFileResult,
} from './storage.types';

const DEFAULT_SIGNED_URL_EXPIRY_SECONDS = 3600;

@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.getOrThrow<string>('storage.region');
    const accessKeyId = this.configService.getOrThrow<string>(
      'storage.accessKeyId',
    );
    const secretAccessKey = this.configService.getOrThrow<string>(
      'storage.secretAccessKey',
    );
    this.bucket = this.configService.getOrThrow<string>('storage.bucket');

    const endpoint = this.configService.get<string>('storage.endpoint');

    this.client = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
      ...(endpoint && { endpoint, forcePathStyle: true }),
    });
  }

  async uploadFile(params: UploadFileParams): Promise<UploadFileResult> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: params.key,
        Body: params.buffer,
        ContentType: params.contentType,
        Metadata: params.metadata,
      }),
    );

    return { key: params.key, bucket: this.bucket };
  }

  async deleteFile(objectKey: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
      }),
    );
  }

  async getSignedUploadUrl(
    params: SignedUploadUrlParams,
  ): Promise<SignedUrlResult> {
    const expiresInSeconds =
      params.expiresInSeconds ?? DEFAULT_SIGNED_URL_EXPIRY_SECONDS;

    const url = await getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: params.key,
        ContentType: params.contentType,
      }),
      { expiresIn: expiresInSeconds },
    );

    return {
      url,
      key: params.key,
      expiresInSeconds,
    };
  }

  async getSignedDownloadUrl(
    params: SignedDownloadUrlParams,
  ): Promise<SignedUrlResult> {
    const expiresInSeconds =
      params.expiresInSeconds ?? DEFAULT_SIGNED_URL_EXPIRY_SECONDS;

    const url = await getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: params.objectKey,
      }),
      { expiresIn: expiresInSeconds },
    );

    return {
      url,
      key: params.objectKey,
      expiresInSeconds,
    };
  }
}
