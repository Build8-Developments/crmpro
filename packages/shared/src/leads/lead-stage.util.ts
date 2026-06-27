export type PipelineCloseType = 'WON' | 'LOST';

/** Minimal stage shape for won/lost/closed checks (API responses, UI). */
export interface LeadStageCloseInfo {
  isClosed: boolean;
  closeType: PipelineCloseType | null;
}

export function isLeadClosed(stage: LeadStageCloseInfo): boolean {
  return stage.isClosed;
}

export function isLeadWon(stage: LeadStageCloseInfo): boolean {
  return stage.isClosed && stage.closeType === 'WON';
}

export function isLeadLost(stage: LeadStageCloseInfo): boolean {
  return stage.isClosed && stage.closeType === 'LOST';
}
