import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { PERMISSIONS } from '@crmpro/shared/auth';
import { PermissionsGuard, RequirePermission } from '../../../common/auth';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/jwt-payload.type';
import { CreateFolderDto } from './dto/create-folder.dto';
import { MoveFilesDto } from './dto/move-files.dto';
import { SetFolderPasswordDto } from './dto/set-folder-password.dto';
import { UnlockFolderDto } from './dto/unlock-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { FolderAccessService } from './folder-access.service';
import { FoldersService } from './folders.service';

@Controller('files')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FoldersController {
  constructor(
    private readonly foldersService: FoldersService,
    private readonly folderAccess: FolderAccessService,
  ) {}

  @Get('folders')
  @RequirePermission(PERMISSIONS.FILE_READ)
  async listFolders(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.foldersService.listFolders(user);
    return { success: true, data };
  }

  @Post('folders')
  @RequirePermission(PERMISSIONS.FILE_UPLOAD)
  async createFolder(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateFolderDto,
  ) {
    const data = await this.foldersService.createFolder(user, dto);
    return { success: true, data };
  }

  /** Rename and/or move. Folder owner or `file.manage`. */
  @Patch('folders/:id')
  @RequirePermission(PERMISSIONS.FILE_UPLOAD)
  async updateFolder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFolderDto,
  ) {
    const data = await this.foldersService.updateFolder(user, id, dto);
    return { success: true, data };
  }

  @Delete('folders/:id')
  @RequirePermission(PERMISSIONS.FILE_DELETE)
  async deleteFolder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.foldersService.deleteFolder(user, id);
    return { success: true, data };
  }

  @Put('folders/:id/password')
  @RequirePermission(PERMISSIONS.FILE_UPLOAD)
  async setPassword(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetFolderPasswordDto,
  ) {
    const data = await this.foldersService.setPassword(user, id, dto);
    return { success: true, data };
  }

  @Post('folders/:id/unlock')
  @HttpCode(200)
  @RequirePermission(PERMISSIONS.FILE_READ)
  async unlock(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UnlockFolderDto,
  ) {
    const data = await this.folderAccess.unlock(user, id, dto.password);
    return { success: true, data };
  }

  @Post('folders/:id/lock')
  @HttpCode(200)
  @RequirePermission(PERMISSIONS.FILE_READ)
  async lock(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.folderAccess.lock(user, id);
    return { success: true, data: { id } };
  }

  @Post('move')
  @HttpCode(200)
  @RequirePermission(PERMISSIONS.FILE_UPLOAD)
  async moveFiles(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: MoveFilesDto,
  ) {
    const data = await this.foldersService.moveFiles(user, dto);
    return { success: true, data };
  }
}
