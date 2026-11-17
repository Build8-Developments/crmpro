import {
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
import { PERMISSIONS, type PermissionKey } from '@crmpro/shared/auth';
import {
  CurrentPermissionKeys,
  PermissionsGuard,
  RequirePermission,
} from '../../common/auth';
import { LeadScopeService } from '../leads/scope/lead-scope.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { CompleteUploadDto } from './dto/complete-upload.dto';
import { GetFilesQueryDto } from './dto/get-files-query.dto';
import { RequestUploadDto } from './dto/request-upload.dto';
import { FilesService } from './files.service';

@Controller('files')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
    private readonly leadScopeService: LeadScopeService,
  ) {}

  @Get()
  @RequirePermission(PERMISSIONS.FILE_READ)
  async listFiles(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentPermissionKeys() permissionKeys: ReadonlySet<PermissionKey>,
    @Query() query: GetFilesQueryDto,
  ) {
    const data = await this.filesService.listFiles(
      user.tenantId,
      query,
      await this.leadScopeService.resolve(user, permissionKeys),
    );
    return { success: true, data };
  }

  @Post('request-upload')
  @RequirePermission(PERMISSIONS.FILE_UPLOAD)
  async requestUpload(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentPermissionKeys() permissionKeys: ReadonlySet<PermissionKey>,
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
    @CurrentPermissionKeys() permissionKeys: ReadonlySet<PermissionKey>,
    @Body() dto: CompleteUploadDto,
  ) {
    const data = await this.filesService.completeUpload(
      user.tenantId,
      user.id,
      dto,
      await this.leadScopeService.resolve(user, permissionKeys),
    );

    return { success: true, data };
  }

  @Get(':id/download-url')
  @RequirePermission(PERMISSIONS.FILE_READ)
  async getDownloadUrl(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentPermissionKeys() permissionKeys: ReadonlySet<PermissionKey>,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.filesService.getDownloadUrl(
      id,
      user.tenantId,
      await this.leadScopeService.resolve(user, permissionKeys),
    );

    return { success: true, data };
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.FILE_DELETE)
  async deleteFile(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentPermissionKeys() permissionKeys: ReadonlySet<PermissionKey>,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.filesService.deleteFile(
      id,
      user.tenantId,
      user.id,
      await this.leadScopeService.resolve(user, permissionKeys),
    );

    return { success: true, data };
  }
}
