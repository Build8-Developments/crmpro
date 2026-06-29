import { TenantStatus } from '@crmpro/database';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ListQueryDto } from '../../../common/query/dto/list-query.dto';

export class GetTenantsQueryDto extends ListQueryDto {
  @IsOptional()
  @IsEnum(TenantStatus)
  status?: TenantStatus;

  @IsOptional()
  @IsUUID()
  planId?: string;
}
