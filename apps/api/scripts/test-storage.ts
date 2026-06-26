import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { StorageService } from '../src/common/storage/storage.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  const storage = app.get(StorageService);
  const key = `test/hello-${Date.now()}.txt`;
  const content = 'Hello from CRMPro storage test!';

  console.log(`Uploading ${key}...`);
  const upload = await storage.uploadFile({
    key,
    buffer: Buffer.from(content),
    contentType: 'text/plain',
  });
  console.log('Upload result:', upload);

  const download = await storage.getSignedDownloadUrl({ objectKey: key });
  console.log('Signed download URL:', download.url);

  const response = await fetch(download.url);
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status} ${response.statusText}`);
  }

  const fetched = await response.text();
  console.log('Fetched content:', fetched);
  console.log('Content matches:', fetched === content);

  console.log(`Deleting ${key}...`);
  await storage.deleteFile(key);
  console.log('Delete complete.');

  await app.close();
}

main().catch((error: unknown) => {
  console.error('Storage test failed:', error);
  process.exit(1);
});
