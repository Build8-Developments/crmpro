import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ADMIN_PERMISSIONS } from '@crmpro/shared';
import type { Request } from 'express';
import {
  AdminPermissionsGuard,
  RequireAdminPermission,
  RequireAnyAdminPermission,
} from '../../common/auth';
import { toListResponseData } from '../../common/http/list-response';
import { CurrentAdmin } from '../auth/decorators/current-admin.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedAdmin } from '../auth/auth.types';
import { extractRequestSecurityMetadata } from '../auth/utils/request-metadata.util';
import { AdminNotesService } from './admin-notes.service';
import { CreateAdminNoteDto } from './dto/create-admin-note.dto';
import { UpdateAdminNoteDto } from './dto/update-admin-note.dto';

@Controller()
@UseGuards(JwtAuthGuard, AdminPermissionsGuard)
export class AdminNotesController {
  constructor(private readonly notesService: AdminNotesService) {}

  @Get('admins/:id/notes')
  @RequireAnyAdminPermission(
    ADMIN_PERMISSIONS.ADMIN_MANAGE,
    ADMIN_PERMISSIONS.AUDIT_READ,
  )
  async listNotes(@Param('id', ParseUUIDPipe) targetAdminId: string) {
    const notes = await this.notesService.listNotes(targetAdminId);
    return { success: true, data: toListResponseData(notes).items };
  }

  @Post('admins/:id/notes')
  @RequireAdminPermission(ADMIN_PERMISSIONS.ADMIN_MANAGE)
  async createNote(
    @Param('id', ParseUUIDPipe) targetAdminId: string,
    @Body() dto: CreateAdminNoteDto,
    @CurrentAdmin() actor: AuthenticatedAdmin,
    @Req() req: Request,
  ) {
    const note = await this.notesService.createNote(
      targetAdminId,
      dto,
      actor.id,
      extractRequestSecurityMetadata(req),
    );
    return { success: true, data: note };
  }

  @Patch('admin-notes/:noteId')
  @RequireAdminPermission(ADMIN_PERMISSIONS.ADMIN_MANAGE)
  async updateNote(
    @Param('noteId', ParseUUIDPipe) noteId: string,
    @Body() dto: UpdateAdminNoteDto,
    @CurrentAdmin() actor: AuthenticatedAdmin,
    @Req() req: Request,
  ) {
    const note = await this.notesService.updateNote(
      noteId,
      dto,
      actor.id,
      extractRequestSecurityMetadata(req),
    );
    return { success: true, data: note };
  }

  @Delete('admin-notes/:noteId')
  @RequireAdminPermission(ADMIN_PERMISSIONS.ADMIN_MANAGE)
  async deleteNote(
    @Param('noteId', ParseUUIDPipe) noteId: string,
    @CurrentAdmin() actor: AuthenticatedAdmin,
    @Req() req: Request,
  ) {
    const data = await this.notesService.deleteNote(
      noteId,
      actor.id,
      extractRequestSecurityMetadata(req),
    );
    return { success: true, data };
  }
}
