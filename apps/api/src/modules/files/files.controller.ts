import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { CompleteUploadDto } from './dto/complete-upload.dto';
import { RequestUploadDto } from './dto/request-upload.dto';
import { FilesService } from './files.service';

@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('request-upload')
  async requestUpload(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RequestUploadDto,
  ) {
    const data = await this.filesService.requestUpload(
      user.tenantId,
      user.id,
      dto,
    );

    return { success: true, data };
  }

  @Post('complete-upload')
  async completeUpload(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CompleteUploadDto,
  ) {
    const data = await this.filesService.completeUpload(
      user.tenantId,
      user.id,
      dto,
    );

    return { success: true, data };
  }

  @Get(':id/download-url')
  async getDownloadUrl(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.filesService.getDownloadUrl(id, user.tenantId);

    return { success: true, data };
  }

  @Delete(':id')
  async deleteFile(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.filesService.deleteFile(
      id,
      user.tenantId,
      user.id,
    );

    return { success: true, data };
  }
}
