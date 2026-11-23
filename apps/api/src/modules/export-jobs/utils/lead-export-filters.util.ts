import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import type { LeadListFilters } from '../../leads/types/lead.types';
import { LeadExportFiltersDto } from '../dto/lead-export-filters.dto';

/**
 * Lead export filters, cleaned for storing on the job and read back from it:
 * runs the value through the leads list's filter DTO (types restored —
 * dates, numbers, booleans, lists), drops unknown keys and any value that no
 * longer validates, and leaves out empty values. Older jobs that stored only
 * pipeline / stage / owner / source / status / search read the same way.
 *
 * The where-builder's run-time context (today, stage thresholds) is never
 * stored; the export loads it when it runs.
 */
export function normalizeLeadExportFilters(input: unknown): LeadListFilters {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};

  const dto = plainToInstance(LeadExportFiltersDto, input);
  const record = dto as unknown as Record<string, unknown>;
  for (const error of validateSync(dto, { whitelist: true })) {
    delete record[error.property];
  }

  const filters: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value) && value.length === 0) continue;
    filters[key] = value;
  }
  return filters;
}
