import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsDate, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { TaskStatus } from '@crmpro/database';
import { ListQueryDto } from '../../../common/query/dto/list-query.dto';

const toBoolean = ({ value }: { value: unknown }) =>
  value === 'true' || value === true
    ? true
    : value === 'false' || value === false
      ? false
      : value;

export class GetTasksQueryDto extends ListQueryDto {
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsUUID()
  leadId?: string;

  @IsOptional()
  @IsUUID()
  assignedUserId?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dueFrom?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dueTo?: Date;

  /** OPEN tasks whose due time has passed. */
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  overdueOnly?: boolean;
}
