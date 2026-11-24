import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthRateLimit } from '../../common/rate-limit/rate-limit.decorator';
import { RateLimitGuard } from '../../common/rate-limit/rate-limit.guard';
import { FindWorkspacesDto } from './dto/find-workspaces.dto';
import { PublicService } from './public.service';

@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  /** Each workspace host asks this once to show its sign-in page. */
  @Get('workspaces/:slug')
  @UseGuards(RateLimitGuard)
  @AuthRateLimit('workspace-lookup')
  async getWorkspace(@Param('slug') slug: string) {
    const data = await this.publicService.lookupWorkspaceBySlug(slug);

    return {
      success: true,
      data,
    };
  }

  /** Emails the workspace links for an address; same answer either way. */
  @Post('workspaces/find')
  @HttpCode(200)
  @UseGuards(RateLimitGuard)
  @AuthRateLimit('workspace-find')
  findWorkspaces(@Body() dto: FindWorkspacesDto) {
    // Not awaited: the answer takes as long whether or not the address has
    // workspaces, so its timing reveals nothing either.
    this.publicService.queueWorkspaceLinks(dto.email);
    return {
      success: true,
      message: 'If this email has a workspace, we have sent the links to it',
    };
  }
}
