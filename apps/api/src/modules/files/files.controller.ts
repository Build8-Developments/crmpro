import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PERMISSIONS } from '@crmpro/shared/auth';
import {
  CurrentLeadScope,
  type LeadScope,
  PermissionsGuard,
  RequirePermission,
} from '../../common/auth';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { CompleteUploadDto } from './dto/complete-upload.dto';
import { GetFilesQueryDto } from './dto/get-files-query.dto';
import { GetFilesStatsQueryDto } from './dto/get-files-stats-query.dto';
import { RequestUploadDto } from './dto/request-upload.dto';
import { FilesService } from './files.service';
import { FolderAccessService } from './folders/folder-access.service';

@Controller('files')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
    private readonly folderAccess: FolderAccessService,
  ) {}

  /** Throws FOLDER_LOCKED if the file sits in a folder this session can't open. */
  private async assertFileAccessible(
    user: AuthenticatedUser,
    fileId: string,
    scope: LeadScope,
  ) {
    const folderId = await this.filesService.getFileFolderId(
      fileId,
      user.tenantId,
      scope,
    );
    if (folderId) {
      await this.folderAccess.assertFolderAccessible(user, folderId);
    }
  }

  @Get()
  @RequirePermission(PERMISSIONS.FILE_READ)
  async listFiles(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentLeadScope() scope: LeadScope,
    @Query() query: GetFilesQueryDto,
  ) {
    const snapshot = await this.folderAccess.snapshot(user);
    if (query.folderId && query.folderId !== 'root') {
      this.folderAccess.assertAccessible(snapshot, query.folderId);
    }
    const data = await this.filesService.listFiles(user.tenantId, query, {
      lockedFolderIds: [...snapshot.lockedIds],
      leadScope: scope,
    });
    return { success: true, data };
  }

  /** Totals, kinds and top uploaders for the gallery info panel. */
  @Get('stats')
  @RequirePermission(PERMISSIONS.FILE_READ)
  async getStats(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentLeadScope() scope: LeadScope,
    @Query() query: GetFilesStatsQueryDto,
  ) {
    const snapshot = await this.folderAccess.snapshot(user);
    if (query.folderId && query.folderId !== 'root') {
      this.folderAccess.assertAccessible(snapshot, query.folderId);
    }
    const data = await this.filesService.getStats(user.tenantId, query, {
      lockedFolderIds: [...snapshot.lockedIds],
      leadScope: scope,
    });
    return { success: true, data };
  }

  @Post('request-upload')
  @RequirePermission(PERMISSIONS.FILE_UPLOAD)
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
  @RequirePermission(PERMISSIONS.FILE_UPLOAD)
  async completeUpload(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentLeadScope() scope: LeadScope,
    @Body() dto: CompleteUploadDto,
  ) {
    if (dto.folderId) {
      if (dto.category !== 'OTHER') {
        throw new BadRequestException(
          'Only general uploads can be placed in a folder',
        );
      }
      await this.folderAccess.assertFolderAccessible(user, dto.folderId);
    }
    const data = await this.filesService.completeUpload(
      user.tenantId,
      user.id,
      dto,
      scope,
    );

    return { success: true, data };
  }

  @Get(':id/preview-url')
  @RequirePermission(PERMISSIONS.FILE_READ)
  async getPreviewUrl(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentLeadScope() scope: LeadScope,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.assertFileAccessible(user, id, scope);
    const data = await this.filesService.getPreviewUrl(
      id,
      user.tenantId,
      scope,
    );
    return { success: true, data };
  }

  @Get(':id/download-url')
  @RequirePermission(PERMISSIONS.FILE_READ)
  async getDownloadUrl(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentLeadScope() scope: LeadScope,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.assertFileAccessible(user, id, scope);
    const data = await this.filesService.getDownloadUrl(
      id,
      user.tenantId,
      scope,
    );

    return { success: true, data };
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.FILE_DELETE)
  async deleteFile(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentLeadScope() scope: LeadScope,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.assertFileAccessible(user, id, scope);
    const data = await this.filesService.deleteFile(
      id,
      user.tenantId,
      user.id,
      scope,
    );

    return { success: true, data };
  }
}
