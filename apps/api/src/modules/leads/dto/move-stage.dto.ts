import { IsUUID } from 'class-validator';

export class MoveStageDto {
  @IsUUID()
  pipelineStageId: string;
}
