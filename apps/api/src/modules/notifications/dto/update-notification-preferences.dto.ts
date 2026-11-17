import { ApiProperty } from '@nestjs/swagger';
import { NotificationPreferenceCategory } from '@crmpro/database';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  ValidateNested,
} from 'class-validator';

export class UpdateNotificationPreferenceItemDto {
  @ApiProperty({ enum: NotificationPreferenceCategory })
  @IsEnum(NotificationPreferenceCategory)
  category!: NotificationPreferenceCategory;

  @ApiProperty()
  @IsBoolean()
  enabled!: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;
}

export class UpdateNotificationPreferencesDto {
  @ApiProperty({ type: [UpdateNotificationPreferenceItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpdateNotificationPreferenceItemDto)
  preferences!: UpdateNotificationPreferenceItemDto[];
}
