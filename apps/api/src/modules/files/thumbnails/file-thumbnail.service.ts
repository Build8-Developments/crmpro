import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../../../common/cache/cache.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { StorageService } from '../../../common/storage/storage.service';
import { renderPdfFirstPage, resizeImage } from './thumbnail-renderer';

/** Longest edge of generated thumbnails, in pixels. */
const THUMBNAIL_WIDTH = 480;
const THUMBNAIL_QUALITY = 80;
/** Don't download huge originals just to make a preview. */
const MAX_SOURCE_BYTES = 25 * 1024 * 1024;
/** One attempt per file per window (also dedupes concurrent list requests). */
const ATTEMPT_WINDOW_SECONDS = 60 * 60;
/** Render at most this many in parallel per API process. */
const MAX_CONCURRENT_RENDERS = 2;

const RASTER_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/avif',
]);

export interface ThumbnailCandidate {
  id: string;
  tenantId: string;
  objectKey: string;
  mimeType: string;
  sizeBytes: bigint;
  thumbnailObjectKey: string | null;
}

export function supportsThumbnail(mimeType: string): boolean {
  return mimeType === 'application/pdf' || RASTER_IMAGE_TYPES.has(mimeType);
}

/**
 * Generates small WebP previews server-side: first page for PDFs, a
 * downscaled copy for images. Runs in the background so uploads and listings
 * never wait on it; files without a thumbnail are picked up lazily the next
 * time they are listed (this also backfills files uploaded before thumbnails
 * existed).
 */
@Injectable()
export class FileThumbnailService {
  private readonly logger = new Logger(FileThumbnailService.name);
  private active = 0;
  private readonly waiting: Array<() => void> = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly cache: CacheService,
  ) {}

  /** Fire-and-forget: schedule thumbnails for any candidates missing one. */
  ensure(files: ThumbnailCandidate[]): void {
    for (const file of files) {
      if (
        file.thumbnailObjectKey ||
        !supportsThumbnail(file.mimeType) ||
        file.sizeBytes > BigInt(MAX_SOURCE_BYTES)
      ) {
        continue;
      }
      void this.tryGenerate(file);
    }
  }

  private async tryGenerate(file: ThumbnailCandidate): Promise<void> {
    try {
      const attempt = await this.cache.incrementWithTtl(
        `files:thumbnail-attempt:${file.id}`,
        ATTEMPT_WINDOW_SECONDS,
      );
      // 0 = Redis unavailable: skip rather than risk render storms.
      if (attempt !== 1) return;

      await this.withSlot(() => this.generate(file));
    } catch (error) {
      this.logger.warn(
        `Thumbnail failed for file ${file.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async generate(file: ThumbnailCandidate): Promise<void> {
    const source = await this.storage.getObject(file.objectKey);
    const image =
      file.mimeType === 'application/pdf'
        ? await renderPdfFirstPage(source, THUMBNAIL_WIDTH, THUMBNAIL_QUALITY)
        : await resizeImage(source, THUMBNAIL_WIDTH, THUMBNAIL_QUALITY);

    const thumbnailKey = `${file.objectKey}.thumb.webp`;
    await this.storage.uploadFile({
      key: thumbnailKey,
      buffer: image,
      contentType: 'image/webp',
    });

    const updated = await this.prisma.fileAsset.updateMany({
      where: { id: file.id, tenantId: file.tenantId, deletedAt: null },
      data: { thumbnailObjectKey: thumbnailKey },
    });
    if (updated.count === 0) {
      // File was deleted while rendering; don't leave the thumbnail behind.
      await this.storage.deleteFile(thumbnailKey).catch(() => undefined);
    }
  }

  /** Small semaphore so a big listing can't render dozens of PDFs at once. */
  private async withSlot<T>(task: () => Promise<T>): Promise<T> {
    if (this.active >= MAX_CONCURRENT_RENDERS) {
      await new Promise<void>((resolve) => this.waiting.push(resolve));
    }
    this.active += 1;
    try {
      return await task();
    } finally {
      this.active -= 1;
      this.waiting.shift()?.();
    }
  }
}
