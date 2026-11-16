import { createRequire } from 'node:module';
import { dirname, join, sep } from 'node:path';

/*
 * Pure rendering helpers, kept apart from FileThumbnailService so unit tests
 * can stub them (pdfjs ships ESM-only, which Jest's CommonJS runtime can't
 * import). Exercised end-to-end through the running API instead.
 */

let fontDir: string | undefined;

function standardFontDir(): string {
  if (!fontDir) {
    const require = createRequire(__filename);
    fontDir =
      join(dirname(require.resolve('pdfjs-dist/package.json')), 'standard_fonts') +
      sep;
  }
  return fontDir;
}

/** First page of a PDF as a white-backed WebP, `width` px wide. */
export async function renderPdfFirstPage(
  source: Buffer,
  width: number,
  quality: number,
): Promise<Buffer> {
  const { createCanvas } = await import('@napi-rs/canvas');
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

  // pdfjs 6 has no eval()-based font paths, so untrusted PDFs don't need the
  // old isEvalSupported switch.
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(source),
    disableFontFace: true,
    standardFontDataUrl: standardFontDir(),
  });

  try {
    const document = await loadingTask.promise;
    const page = await document.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: width / base.width });
    const canvas = createCanvas(
      Math.ceil(viewport.width),
      Math.ceil(viewport.height),
    );
    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({
      canvas: canvas as unknown as HTMLCanvasElement,
      canvasContext: context as unknown as CanvasRenderingContext2D,
      viewport,
    }).promise;
    return canvas.encode('webp', quality);
  } finally {
    await loadingTask.destroy();
  }
}

/** Downscaled WebP copy of a raster image (never upscales). */
export async function resizeImage(
  source: Buffer,
  width: number,
  quality: number,
): Promise<Buffer> {
  const { createCanvas, loadImage } = await import('@napi-rs/canvas');
  const image = await loadImage(source);
  const scale = Math.min(1, width / Math.max(image.width, 1));
  const w = Math.max(1, Math.round(image.width * scale));
  const h = Math.max(1, Math.round(image.height * scale));
  const canvas = createCanvas(w, h);
  canvas.getContext('2d').drawImage(image, 0, 0, w, h);
  return canvas.encode('webp', quality);
}
