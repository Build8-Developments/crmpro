import {
  FileAssetCategory,
  InteractionChannel,
  InteractionOutcome,
} from '@crmpro/database';

export interface LeadAttachmentSummary {
  id: string;
  category: FileAssetCategory;
  originalFilename: string;
  mimeType: string;
  sizeBytes: string;
  createdAt: Date;
  uploadedBy: { id: string; name: string };
  /** Set when the file was attached as evidence of a logged interaction. */
  interaction: {
    id: string;
    channel: InteractionChannel;
    outcome: InteractionOutcome;
    occurredAt: Date;
  } | null;
}
