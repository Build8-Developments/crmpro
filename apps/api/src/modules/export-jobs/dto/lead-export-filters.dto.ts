import { LeadSelectionFiltersDto } from '../../leads/dto/get-leads-query.dto';

/**
 * Lead export filters: exactly the leads list's (search + every
 * GetLeadsQueryDto filter), so "export what I see" holds. The export runs
 * them through the list's where-builder (see LeadExportService).
 */
export class LeadExportFiltersDto extends LeadSelectionFiltersDto {}
