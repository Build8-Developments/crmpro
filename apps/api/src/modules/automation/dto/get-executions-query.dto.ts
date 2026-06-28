import { AutomationExecutionStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { ListQueryDto } from '../../../common/query/dto/list-query.dto';

export class GetExecutionsQueryDto extends ListQueryDto {
  @IsOptional()
  @IsEnum(AutomationExecutionStatus)
  status?: AutomationExecutionStatus;
}
