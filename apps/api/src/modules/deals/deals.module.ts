import { StatsModule } from '../stats/stats.module';
import { Module } from '@nestjs/common';
import { AuthRbacModule } from '../../common/auth/auth-rbac.module';
import { AuditModule } from '../audit/audit.module';
import { LeadActivityModule } from '../leads/lead-activity.module';
import { LeadsModule } from '../leads/leads.module';
import { WorkflowModule } from '../workflow/workflow.module';
import { DealsController } from './deals.controller';
import { DealsCoreModule } from './deals-core.module';
import { DealsService } from './deals.service';
import { LeadDealsController } from './lead-deals.controller';

/** Deals on won leads (spec §2.5): list, edit, contract, cancel. */
@Module({
  imports: [
    AuthRbacModule,
    AuditModule,
    LeadActivityModule,
    LeadsModule,
    DealsCoreModule,
    StatsModule,
    WorkflowModule,
  ],
  controllers: [DealsController, LeadDealsController],
  providers: [DealsService],
})
export class DealsModule {}
