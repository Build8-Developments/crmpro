import { completeFileUpload, requestFileUpload } from "@/features/files/api";
import type { CompleteUploadInput } from "@/features/files/types";

/** PUTs the file to the presigned storage URL. */
function putToStorage(uploadUrl: string, file: File, contentType: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error("Upload to storage failed"));
    xhr.onerror = () => reject(new Error("Upload to storage failed"));
    xhr.send(file);
  });
}

/** Presigned upload: request intent → PUT to storage → register the file. */
export async function uploadFile(
  file: File,
  category: CompleteUploadInput["category"],
  options?: { leadId?: string },
) {
  const contentType = file.type || "application/octet-stream";
  const intent = await requestFileUpload({
    fileName: file.name,
    contentType,
    sizeBytes: file.size,
  });

  await putToStorage(intent.uploadUrl, file, contentType);

  return completeFileUpload({
    objectKey: intent.objectKey,
    category,
    ...(options?.leadId ? { leadId: options.leadId } : {}),
  });
}
