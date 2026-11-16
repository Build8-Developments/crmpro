/** Coarse file kinds for the Files gallery breakdowns. */
export type FileKind =
  | 'image'
  | 'pdf'
  | 'spreadsheet'
  | 'document'
  | 'video'
  | 'audio'
  | 'archive'
  | 'other';

export function fileKindOf(mimeType: string): FileKind {
  const mime = mimeType.toLowerCase();
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.includes('pdf')) return 'pdf';
  if (
    mime.includes('csv') ||
    mime.includes('spreadsheet') ||
    mime.includes('excel')
  )
    return 'spreadsheet';
  if (
    mime.includes('word') ||
    mime.includes('document') ||
    mime.includes('presentation') ||
    mime.startsWith('text/')
  )
    return 'document';
  if (mime.includes('zip') || mime.includes('compressed') || mime.includes('rar'))
    return 'archive';
  return 'other';
}
