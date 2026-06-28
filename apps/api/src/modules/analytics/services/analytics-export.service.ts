import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { stringify } from 'csv-stringify/sync';
import {
  AnalyticsDateRange,
  AnalyticsExportFile,
  DashboardExportSnapshot,
} from '../analytics.types';
import { AnalyticsExportFormat } from '../analytics.constants';
import { AnalyticsQueryService } from '../queries/analytics-query.service';

@Injectable()
export class AnalyticsExportService {
  constructor(private readonly queryService: AnalyticsQueryService) {}

  async buildDashboardSnapshot(
    tenantId: string,
    range: AnalyticsDateRange,
  ): Promise<DashboardExportSnapshot> {
    const [overview, pipeline, sources, agents, trends, status] =
      await Promise.all([
        this.queryService.getOverview(tenantId, range),
        this.queryService.getPipelineFunnel(tenantId, range),
        this.queryService.getLeadSources(tenantId, range),
        this.queryService.getAgentPerformance(tenantId, range),
        this.queryService.getLeadTrends(tenantId, range),
        this.queryService.getStatusDistribution(tenantId, range),
      ]);

    return {
      overview,
      pipeline,
      sources,
      agents,
      trends,
      status,
      generatedAt: new Date().toISOString(),
    };
  }

  async exportDashboard(
    tenantId: string,
    range: AnalyticsDateRange,
    format: AnalyticsExportFormat,
  ): Promise<AnalyticsExportFile> {
    const snapshot = await this.buildDashboardSnapshot(tenantId, range);
    const stamp = snapshot.generatedAt.slice(0, 10);

    if (format === 'PDF') {
      return {
        buffer: await this.generatePdf(snapshot),
        mimeType: 'application/pdf',
        filename: `crmpro-dashboard-${stamp}.pdf`,
      };
    }

    return {
      buffer: this.generateCsv(snapshot),
      mimeType: 'text/csv; charset=utf-8',
      filename: `crmpro-dashboard-${stamp}.csv`,
    };
  }

  private generateCsv(snapshot: DashboardExportSnapshot): Buffer {
    const rows: Array<Record<string, string | number | null>> = [];

    rows.push({ section: 'Overview', metric: 'Generated At', value: snapshot.generatedAt });
    rows.push({ section: 'Overview', metric: 'Total Leads', value: snapshot.overview.totalLeads });
    rows.push({ section: 'Overview', metric: 'Open Leads', value: snapshot.overview.openLeads });
    rows.push({ section: 'Overview', metric: 'Won Leads', value: snapshot.overview.wonLeads });
    rows.push({ section: 'Overview', metric: 'Lost Leads', value: snapshot.overview.lostLeads });
    rows.push({ section: 'Overview', metric: 'Conversion Rate %', value: snapshot.overview.conversionRate });
    rows.push({
      section: 'Overview',
      metric: 'Avg Response Time (hours)',
      value: snapshot.overview.avgResponseTimeHours,
    });
    rows.push({
      section: 'Overview',
      metric: 'Avg Lead Age (days)',
      value: snapshot.overview.avgLeadAgeDays,
    });
    rows.push({ section: 'Overview', metric: 'New Today', value: snapshot.overview.newToday });
    rows.push({ section: 'Overview', metric: 'New This Week', value: snapshot.overview.newThisWeek });
    rows.push({ section: 'Overview', metric: 'New This Month', value: snapshot.overview.newThisMonth });

    for (const pipeline of snapshot.pipeline) {
      for (const stage of pipeline.stages) {
        rows.push({
          section: `Pipeline: ${pipeline.pipelineName}`,
          metric: stage.stageName,
          value: stage.count,
          percentage: stage.percentage,
          dropOffFromPrevious: stage.dropOffFromPrevious,
        });
      }
    }

    for (const source of snapshot.sources) {
      rows.push({
        section: 'Lead Sources',
        metric: source.sourceName,
        value: source.count,
        won: source.won,
        conversionRate: source.conversionRate,
      });
    }

    for (const agent of snapshot.agents) {
      rows.push({
        section: 'Sales Agents',
        metric: agent.name,
        value: agent.assignedLeads,
        won: agent.won,
        lost: agent.lost,
        conversionRate: agent.conversionRate,
        avgResponseTimeHours: agent.avgResponseTimeHours,
        avgClosingTimeDays: agent.avgClosingTimeDays,
      });
    }

    for (const trend of snapshot.trends) {
      rows.push({
        section: 'Monthly Trends',
        metric: trend.month,
        value: trend.newLeads,
        won: trend.won,
        lost: trend.lost,
      });
    }

    rows.push({
      section: 'Status Distribution',
      metric: 'Open',
      value: snapshot.status.open,
    });
    rows.push({
      section: 'Status Distribution',
      metric: 'Won',
      value: snapshot.status.won,
    });
    rows.push({
      section: 'Status Distribution',
      metric: 'Lost',
      value: snapshot.status.lost,
    });
    rows.push({
      section: 'Status Distribution',
      metric: 'Archived',
      value: snapshot.status.archived,
    });

    const content = stringify(rows, {
      header: true,
      columns: [
        { key: 'section', header: 'Section' },
        { key: 'metric', header: 'Metric' },
        { key: 'value', header: 'Value' },
        { key: 'won', header: 'Won' },
        { key: 'lost', header: 'Lost' },
        { key: 'percentage', header: 'Percentage' },
        { key: 'dropOffFromPrevious', header: 'Drop Off %' },
        { key: 'conversionRate', header: 'Conversion %' },
        { key: 'avgResponseTimeHours', header: 'Avg Response (hrs)' },
        { key: 'avgClosingTimeDays', header: 'Avg Closing (days)' },
      ],
    });

    return Buffer.from(content, 'utf-8');
  }

  private generatePdf(snapshot: DashboardExportSnapshot): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 48, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(20).text('CRMPro Analytics Dashboard', { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).fillColor('#666').text(`Generated: ${snapshot.generatedAt}`, {
        align: 'center',
      });
      doc.moveDown(1.5);
      doc.fillColor('#000');

      this.writePdfSectionTitle(doc, 'Overview');
      this.writePdfKeyValues(doc, [
        ['Total Leads', snapshot.overview.totalLeads],
        ['Open Leads', snapshot.overview.openLeads],
        ['Won Leads', snapshot.overview.wonLeads],
        ['Lost Leads', snapshot.overview.lostLeads],
        ['Conversion Rate', `${snapshot.overview.conversionRate}%`],
        [
          'Avg Response Time',
          this.formatNullable(snapshot.overview.avgResponseTimeHours, 'hrs'),
        ],
        [
          'Avg Lead Age',
          this.formatNullable(snapshot.overview.avgLeadAgeDays, 'days'),
        ],
        ['New Today', snapshot.overview.newToday],
        ['New This Week', snapshot.overview.newThisWeek],
        ['New This Month', snapshot.overview.newThisMonth],
      ]);

      for (const pipeline of snapshot.pipeline) {
        this.writePdfSectionTitle(doc, `Pipeline: ${pipeline.pipelineName}`);
        for (const stage of pipeline.stages) {
          const dropOff =
            stage.dropOffFromPrevious === null
              ? ''
              : ` | Drop-off: ${stage.dropOffFromPrevious}%`;
          doc
            .fontSize(10)
            .text(
              `${stage.stageName}: ${stage.count} (${stage.percentage}%)${dropOff}`,
            );
        }
        doc.moveDown();
      }

      this.writePdfSectionTitle(doc, 'Lead Sources');
      for (const source of snapshot.sources) {
        doc
          .fontSize(10)
          .text(
            `${source.sourceName}: ${source.count} leads | Won: ${source.won} | Conversion: ${source.conversionRate}%`,
          );
      }
      doc.moveDown();

      this.writePdfSectionTitle(doc, 'Sales Agents');
      for (const agent of snapshot.agents) {
        doc.fontSize(10).text(
          [
            `${agent.name}: ${agent.assignedLeads} assigned`,
            `Won ${agent.won} / Lost ${agent.lost}`,
            `Conversion ${agent.conversionRate}%`,
            `Avg Response ${this.formatNullable(agent.avgResponseTimeHours, 'hrs')}`,
            `Avg Closing ${this.formatNullable(agent.avgClosingTimeDays, 'days')}`,
          ].join(' | '),
        );
      }
      doc.moveDown();

      this.writePdfSectionTitle(doc, 'Monthly Trends');
      for (const trend of snapshot.trends) {
        doc
          .fontSize(10)
          .text(
            `${trend.month}: New ${trend.newLeads} | Won ${trend.won} | Lost ${trend.lost}`,
          );
      }
      doc.moveDown();

      this.writePdfSectionTitle(doc, 'Status Distribution');
      this.writePdfKeyValues(doc, [
        ['Open', snapshot.status.open],
        ['Won', snapshot.status.won],
        ['Lost', snapshot.status.lost],
        ['Archived', snapshot.status.archived],
      ]);

      doc.end();
    });
  }

  private writePdfSectionTitle(
    doc: InstanceType<typeof PDFDocument>,
    title: string,
  ): void {
    doc.moveDown(0.5);
    doc.fontSize(14).fillColor('#111').text(title, { underline: true });
    doc.moveDown(0.5);
  }

  private writePdfKeyValues(
    doc: InstanceType<typeof PDFDocument>,
    entries: Array<[string, string | number]>,
  ): void {
    for (const [label, value] of entries) {
      doc.fontSize(10).fillColor('#000').text(`${label}: ${value}`);
    }
    doc.moveDown();
  }

  private formatNullable(value: number | null, unit: string): string {
    return value === null ? 'N/A' : `${value} ${unit}`;
  }
}
