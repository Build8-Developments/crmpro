import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';
import { ListQueryDto } from '../../../common/query';

function parseOptionalBoolean(value: unknown): boolean | undefined {
  if (value === 'true' || value === true) {
    return true;
  }
  if (value === 'false' || value === false) {
    return false;
  }
  return undefined;
}

export class GetProjectsQueryDto extends ListQueryDto {
  @IsOptional()
  @IsUUID()
  developerId?: string;

  @IsOptional()
  @Transform(({ value }) => parseOptionalBoolean(value))
  @IsBoolean()
  isActive?: boolean;
}
