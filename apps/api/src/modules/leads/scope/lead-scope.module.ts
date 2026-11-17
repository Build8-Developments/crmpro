import { Module } from '@nestjs/common';
import { LeadScopeService } from './lead-scope.service';

@Module({
  providers: [LeadScopeService],
  exports: [LeadScopeService],
})
export class LeadScopeModule {}
