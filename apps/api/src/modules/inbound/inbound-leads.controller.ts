import {
  Body,
  Controller,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiKeyGuard } from './guards/api-key.guard';
import { InboundLeadDto } from './dto/inbound-lead.dto';
import { InboundLeadsService } from './inbound-leads.service';
import type { ApiKeyRequest } from './types/inbound.types';

/**
 * POST /api/v1/inbound/leads — leads from website forms, Zapier/Make and ad
 * platforms. Auth by API key (Settings → Integrations), no user session.
 * See docs/api/inbound-leads.md.
 */
@Controller('inbound')
@UseGuards(ApiKeyGuard)
export class InboundLeadsController {
  constructor(private readonly inboundLeadsService: InboundLeadsService) {}

  @Post('leads')
  async createLead(
    @Req() request: ApiKeyRequest,
    @Res({ passthrough: true }) response: Response,
    @Body() dto: InboundLeadDto,
  ) {
    // Set by ApiKeyGuard; the guard rejects the request otherwise.
    const key = request.apiKey!;
    const data = await this.inboundLeadsService.ingest(key, dto);

    response.status(
      data.status === 'created' ? HttpStatus.CREATED : HttpStatus.OK,
    );
    return { success: true, data };
  }
}
