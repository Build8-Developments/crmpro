import { Injectable } from '@nestjs/common';
import { stringify } from 'csv-stringify/sync';
import { LEAD_EXPORT_CSV_HEADERS } from '../export-jobs.constants';
import { LeadExportRow } from '../entities/export-job.types';

@Injectable()
export class CsvExportService {
  generateCsv(rows: LeadExportRow[]): Buffer {
    const content = stringify(rows, {
      header: true,
      columns: [
        { key: 'leadName', header: LEAD_EXPORT_CSV_HEADERS[0] },
        { key: 'primaryPhone', header: LEAD_EXPORT_CSV_HEADERS[1] },
        { key: 'secondaryPhone', header: LEAD_EXPORT_CSV_HEADERS[2] },
        { key: 'email', header: LEAD_EXPORT_CSV_HEADERS[3] },
        { key: 'leadSource', header: LEAD_EXPORT_CSV_HEADERS[4] },
        { key: 'pipeline', header: LEAD_EXPORT_CSV_HEADERS[5] },
        { key: 'stage', header: LEAD_EXPORT_CSV_HEADERS[6] },
        { key: 'assignedUser', header: LEAD_EXPORT_CSV_HEADERS[7] },
        { key: 'interestedProjects', header: LEAD_EXPORT_CSV_HEADERS[8] },
        { key: 'status', header: LEAD_EXPORT_CSV_HEADERS[9] },
        { key: 'createdAt', header: LEAD_EXPORT_CSV_HEADERS[10] },
      ],
    });

    return Buffer.from(content, 'utf-8');
  }
}
