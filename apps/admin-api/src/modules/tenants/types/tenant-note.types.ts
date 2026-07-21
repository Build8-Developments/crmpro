export interface TenantNoteAuthor {
  id: string;
  fullName: string;
  email: string;
}

export interface TenantNoteItem {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: TenantNoteAuthor;
}
