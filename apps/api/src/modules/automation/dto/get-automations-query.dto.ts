import { AutomationTriggerType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { ListQueryDto } from '../../../common/query/dto/list-query.dto';

export class GetAutomationsQueryDto extends ListQueryDto {
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsEnum(AutomationTriggerType)
  trigger?: AutomationTriggerType;
}
