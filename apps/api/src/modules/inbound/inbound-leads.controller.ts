import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiKeyGuard, type ApiKeyRequest } from './api-key.guard';
import { InboundLeadDto } from './dto/inbound-lead.dto';
import { InboundLeadsService } from './inbound-leads.service';

/**
 * POST /api/v1/inbound/leads — create a lead from an external system.
 * Auth: `X-Api-Key: crm_live_…` (Settings → Integrations).
 */
@Controller('inbound')
@UseGuards(ApiKeyGuard)
export class InboundLeadsController {
  constructor(private readonly inbound: InboundLeadsService) {}

  @Post('leads')
  @HttpCode(200)
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  async createLead(@Req() request: ApiKeyRequest, @Body() dto: InboundLeadDto) {
    const key = request.apiKey!;
    const data = await this.inbound.ingest(key.tenantId, key.id, dto);
    return { success: true, data };
  }
}
