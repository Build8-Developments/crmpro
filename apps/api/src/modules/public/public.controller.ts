import { Controller, Get, Param } from '@nestjs/common';
import { PublicService } from './public.service';

@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('workspaces/:slug')
  async getWorkspace(@Param('slug') slug: string) {
    const data = await this.publicService.lookupWorkspaceBySlug(slug);

    return {
      success: true,
      data,
    };
  }
}
