import {
  Body,
  Controller,
  Delete,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { PERMISSIONS } from '@crmpro/shared/auth';
import { PermissionsGuard, RequirePermission } from '../../common/auth';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { UpdateLeadNoteDto } from './dto/update-lead-note.dto';
import { LeadNotesService } from './services/lead-notes.service';

@Controller('lead-notes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LeadNotesController {
  constructor(private readonly leadNotesService: LeadNotesService) {}

  @Patch(':noteId')
  @RequirePermission(PERMISSIONS.LEAD_NOTE_UPDATE)
  async updateNote(
    @CurrentUser() user: AuthenticatedUser,
    @Param('noteId', ParseUUIDPipe) noteId: string,
    @Body() dto: UpdateLeadNoteDto,
  ) {
    const data = await this.leadNotesService.updateNote(
      noteId,
      user.tenantId,
      user.id,
      dto,
    );

    return { success: true, data };
  }

  @Delete(':noteId')
  @RequirePermission(PERMISSIONS.LEAD_NOTE_DELETE)
  async deleteNote(
    @CurrentUser() user: AuthenticatedUser,
    @Param('noteId', ParseUUIDPipe) noteId: string,
  ) {
    const data = await this.leadNotesService.deleteNote(
      noteId,
      user.tenantId,
      user.id,
    );

    return { success: true, data };
  }
}
