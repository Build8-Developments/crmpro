import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { AssignLeadDto } from './dto/assign-lead.dto';
import { ContactAccessDto } from './dto/contact-access.dto';
import { LeadContactAccessService } from './services/lead-contact-access.service';
import { MergeLeadsDto } from './dto/merge-leads.dto';
import { LeadMergeService } from './services/lead-merge.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { CreateLeadNoteDto } from './dto/create-lead-note.dto';
import { GetLeadActivitiesQueryDto } from './dto/get-lead-activities-query.dto';
import { GetLeadsQueryDto } from './dto/get-leads-query.dto';
import { MoveStageDto } from './dto/move-stage.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { LeadsService } from './leads.service';
import { LeadAttachmentService } from '../lead-attachments/lead-attachment.service';
import { LeadAssignmentService } from './services/lead-assignment.service';
import { LeadNotesService } from './services/lead-notes.service';
import { LeadStageService } from './services/lead-stage.service';
import { LeadTimelineService } from './services/lead-timeline.service';

@Controller('leads')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LeadsController {
  constructor(
    private readonly leadsService: LeadsService,
    private readonly leadStageService: LeadStageService,
    private readonly leadAssignmentService: LeadAssignmentService,
    private readonly leadNotesService: LeadNotesService,
    private readonly leadTimelineService: LeadTimelineService,
    private readonly leadAttachmentService: LeadAttachmentService,
    private readonly contactAccess: LeadContactAccessService,
    private readonly leadMergeService: LeadMergeService,
  ) {}

  @Get()
  @RequirePermission(PERMISSIONS.LEAD_READ)
  async listLeads(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentLeadScope() scope: LeadScope,
    @Query() query: GetLeadsQueryDto,
  ) {
    const data = await this.leadsService.listLeads(user.tenantId, query, scope);

    return { success: true, data };
  }

  @Post()
  @RequirePermission(PERMISSIONS.LEAD_CREATE)
  async createLead(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentLeadScope() scope: LeadScope,
    @Body() dto: CreateLeadDto,
  ) {
    const data = await this.leadsService.createLead(
      user.tenantId,
      user.id,
      dto,
      scope,
    );

    return { success: true, data };
  }

  @Get(':id/notes')
  @RequirePermission(PERMISSIONS.LEAD_NOTE_READ)
  async listNotes(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentLeadScope() scope: LeadScope,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.leadNotesService.listNotes(
      id,
      user.tenantId,
      scope,
    );

    return { success: true, data };
  }

  @Get(':id/activities')
  @RequirePermission(PERMISSIONS.LEAD_READ)
  async listActivities(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentLeadScope() scope: LeadScope,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: GetLeadActivitiesQueryDto,
  ) {
    const data = await this.leadTimelineService.getLeadActivities(
      id,
      user.tenantId,
      query,
      scope,
    );

    return { success: true, data };
  }

  @Get(':id/attachments')
  @RequirePermission(PERMISSIONS.LEAD_READ)
  async listAttachments(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentLeadScope() scope: LeadScope,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.leadAttachmentService.listAttachments(
      id,
      user.tenantId,
      scope,
    );

    return { success: true, data };
  }

  @Post(':id/notes')
  @RequirePermission(PERMISSIONS.LEAD_NOTE_CREATE)
  async createNote(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentLeadScope() scope: LeadScope,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateLeadNoteDto,
  ) {
    const data = await this.leadNotesService.createNote(
      id,
      user.tenantId,
      user.id,
      dto,
      scope,
    );

    return { success: true, data };
  }

  /** Real phone/email for one field; every call is logged (timeline + audit). */
  @Post(':id/contact-access')
  @RequirePermission(PERMISSIONS.LEAD_READ)
  async accessContact(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentLeadScope() scope: LeadScope,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ContactAccessDto,
  ) {
    const data = await this.contactAccess.access(
      user.tenantId,
      user.id,
      id,
      dto.field,
      dto.action,
      scope,
    );

    return { success: true, data };
  }

  @Post(':id/move-stage')
  @RequirePermission(PERMISSIONS.LEAD_UPDATE)
  async moveStage(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentLeadScope() scope: LeadScope,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MoveStageDto,
  ) {
    const data = await this.leadStageService.moveStage(
      id,
      user.tenantId,
      user.id,
      dto,
      scope,
    );

    return { success: true, data };
  }

  @Post(':id/assign')
  @RequirePermission(PERMISSIONS.LEAD_ASSIGN)
  async assignLead(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentLeadScope() scope: LeadScope,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignLeadDto,
  ) {
    const data = await this.leadAssignmentService.assignLead(
      id,
      user.tenantId,
      user.id,
      dto,
      scope,
    );

    return { success: true, data };
  }

  /** Other leads in scope that look like the same person (phone or email). */
  @Get(':id/duplicates')
  @RequirePermission(PERMISSIONS.LEAD_READ)
  async listDuplicates(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentLeadScope() scope: LeadScope,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.leadMergeService.findDuplicates(
      id,
      user.tenantId,
      scope,
    );

    return { success: true, data };
  }

  /** Merge `sourceLeadId` into this lead; this lead survives. */
  @Post(':id/merge')
  @RequirePermission(PERMISSIONS.LEAD_MERGE)
  async mergeLeads(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentLeadScope() scope: LeadScope,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MergeLeadsDto,
  ) {
    const data = await this.leadMergeService.mergeLeads(
      id,
      user.tenantId,
      user.id,
      dto,
      scope,
    );

    return { success: true, data };
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.LEAD_READ)
  async getLead(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentLeadScope() scope: LeadScope,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.leadsService.getLead(id, user.tenantId, scope);

    return { success: true, data };
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.LEAD_UPDATE)
  async updateLead(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentLeadScope() scope: LeadScope,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeadDto,
  ) {
    const data = await this.leadsService.updateLead(
      id,
      user.tenantId,
      dto,
      user.id,
      scope,
    );

    return { success: true, data };
  }
}
