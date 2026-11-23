import { BadRequestException, Injectable } from '@nestjs/common';
import { ExportFormat, Prisma } from '@crmpro/database';
import { SortOrder } from '../../../common/query';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { LeadsService } from '../../leads/leads.service';
import { LeadExportParams } from '../../leads/types/lead.types';
import { loadLeadFilterContext } from '../../leads/utils/lead-filter-where.util';
import { CustomFieldsService } from '../../custom-fields/custom-fields.service';
import { toStoredCustomFields } from '../../custom-fields/custom-field-values';
import { LeadExportRow } from '../entities/export-job.types';
import { buildLeadExportColumns, type ExportColumn } from './export-columns';
import {
  CONTACT_CHANNEL_LABELS,
  CONTACT_TIME_LABELS,
  PAYMENT_PREFERENCE_LABELS,
  PURCHASE_PURPOSE_LABELS,
} from '@crmpro/shared/leads';
import { EXPORT_PROGRESS_BATCH_SIZE } from '../export-jobs.constants';
import { type LeadScope, leadScopeWhere } from '../../../common/auth';

const leadExportSelect = {
  fullName: true,
  primaryPhone: true,
  secondaryPhone: true,
  email: true,
  status: true,
  createdAt: true,
  occupation: true,
  residenceArea: true,
  paymentPreference: true,
  contactChannelPreference: true,
  contactTimePreference: true,
  purchasePurpose: true,
  budgetMin: true,
  budgetMax: true,
  heat: true,
  lastContactedAt: true,
  customFields: true,
  lostReason: { select: { name: true } },
  source: { select: { name: true } },
  pipeline: { select: { name: true } },
  pipelineStage: { select: { name: true } },
  assignedUser: { select: { name: true } },
  leadProjectInterests: {
    select: {
      project: { select: { name: true } },
    },
    orderBy: { project: { name: 'asc' } },
  },
} satisfies Prisma.LeadSelect;

type LeadExportRecord = Prisma.LeadGetPayload<{
  select: typeof leadExportSelect;
}>;

@Injectable()
export class LeadExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leadsService: LeadsService,
    private readonly customFields: CustomFieldsService,
  ) {}

  /** Built-in columns plus one per active custom field. */
  async loadColumns(tenantId: string): Promise<ExportColumn<LeadExportRow>[]> {
    const definitions = await this.customFields.getLeadDefinitions(tenantId);
    return buildLeadExportColumns(
      definitions.filter((field) => !field.archivedAt),
    );
  }

  /**
   * The leads list's own where-builder (every list filter, incl. the ones
   * that need the tenant's today or stage thresholds), so an export holds
   * exactly the leads the list showed.
   */
  async buildWhereInput(
    tenantId: string,
    params: LeadExportParams,
    scope: LeadScope,
  ): Promise<Prisma.LeadWhereInput> {
    const context = await loadLeadFilterContext(
      this.prisma,
      tenantId,
      params,
      new Date(),
    );
    return {
      AND: [
        this.leadsService.buildLeadsWhereInput(tenantId, {
          ...params,
          ...context,
        }),
        leadScopeWhere(scope),
      ],
    };
  }

  buildOrderBy(params: LeadExportParams): Prisma.LeadOrderByWithRelationInput {
    return this.leadsService.buildLeadsOrderBy(
      params.sortBy,
      params.sortOrder as SortOrder | undefined,
    );
  }

  async countLeadsForExport(
    tenantId: string,
    params: LeadExportParams,
    scope: LeadScope,
  ): Promise<number> {
    return this.prisma.lead.count({
      where: await this.buildWhereInput(tenantId, params, scope),
    });
  }

  async fetchAllForExport(
    tenantId: string,
    params: LeadExportParams,
    scope: LeadScope,
    onProgress?: (processedRows: number, totalRows: number) => Promise<void>,
  ): Promise<LeadExportRow[]> {
    const where = await this.buildWhereInput(tenantId, params, scope);
    const orderBy = this.buildOrderBy(params);
    const totalRows = await this.prisma.lead.count({ where });
    const rows: LeadExportRow[] = [];
    let processedRows = 0;

    while (processedRows < totalRows) {
      const batch = await this.prisma.lead.findMany({
        where,
        select: leadExportSelect,
        orderBy,
        skip: processedRows,
        take: EXPORT_PROGRESS_BATCH_SIZE,
      });

      if (batch.length === 0) {
        break;
      }

      rows.push(...batch.map((lead) => this.toExportRow(lead)));
      processedRows += batch.length;

      if (onProgress) {
        await onProgress(processedRows, totalRows);
      }
    }

    return rows;
  }

  assertSupportedFormat(format: string): void {
    if (format !== ExportFormat.CSV && format !== ExportFormat.XLSX) {
      throw new BadRequestException(
        `Export format ${format} is not supported. Use CSV or XLSX.`,
      );
    }
  }

  private toExportRow(lead: LeadExportRecord): LeadExportRow {
    return {
      leadName: lead.fullName,
      primaryPhone: lead.primaryPhone,
      secondaryPhone: lead.secondaryPhone ?? '',
      email: lead.email ?? '',
      leadSource: lead.source?.name ?? '',
      pipeline: lead.pipeline.name,
      stage: lead.pipelineStage.name,
      assignedUser: lead.assignedUser?.name ?? '',
      interestedProjects: lead.leadProjectInterests
        .map((interest) => interest.project.name)
        .join(', '),
      status: lead.status,
      createdAt: lead.createdAt.toISOString(),
      occupation: lead.occupation ?? '',
      residenceArea: lead.residenceArea ?? '',
      paymentPreference: lead.paymentPreference
        ? PAYMENT_PREFERENCE_LABELS[lead.paymentPreference]
        : '',
      contactChannel: lead.contactChannelPreference
        ? CONTACT_CHANNEL_LABELS[lead.contactChannelPreference]
        : '',
      contactTime: lead.contactTimePreference
        ? CONTACT_TIME_LABELS[lead.contactTimePreference]
        : '',
      purchasePurpose: lead.purchasePurpose
        ? PURCHASE_PURPOSE_LABELS[lead.purchasePurpose]
        : '',
      budgetMin: lead.budgetMin?.toString() ?? '',
      budgetMax: lead.budgetMax?.toString() ?? '',
      heat: lead.heat,
      lastContactedAt: lead.lastContactedAt?.toISOString() ?? '',
      lostReason: lead.lostReason?.name ?? '',
      customFields: toStoredCustomFields(lead.customFields),
    };
  }
}
