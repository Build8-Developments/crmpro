import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsUUID } from 'class-validator';
import { NUDGE_KINDS, type NudgeKind } from '../dashboard-attention.types';

/** POST /analytics/v2/attention/nudge */
export class DashboardAttentionNudgeDto {
  @ApiProperty({ format: 'uuid', description: 'The agent to remind' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ enum: NUDGE_KINDS })
  @IsIn(NUDGE_KINDS)
  kind!: NudgeKind;
}
