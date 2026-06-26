import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PERMISSIONS } from '@crmpro/shared/auth';
import { PermissionsGuard, RequirePermission } from '../../common/auth';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { DevelopersService } from './developers.service';
import { CreateDeveloperDto } from './dto/create-developer.dto';
import { GetDevelopersQueryDto } from './dto/get-developers-query.dto';
import { UpdateDeveloperDto } from './dto/update-developer.dto';

@Controller('developers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DevelopersController {
  constructor(private readonly developersService: DevelopersService) {}

  @Get()
  @RequirePermission(PERMISSIONS.DEVELOPER_READ)
  async listDevelopers(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetDevelopersQueryDto,
  ) {
    const data = await this.developersService.listDevelopers(
      user.tenantId,
      query,
    );

    return { success: true, data };
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.DEVELOPER_READ)
  async getDeveloper(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.developersService.getDeveloper(id, user.tenantId);

    return { success: true, data };
  }

  @Post()
  @RequirePermission(PERMISSIONS.DEVELOPER_CREATE)
  async createDeveloper(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDeveloperDto,
  ) {
    const data = await this.developersService.createDeveloper(
      user.tenantId,
      dto,
    );

    return { success: true, data };
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.DEVELOPER_UPDATE)
  async updateDeveloper(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDeveloperDto,
  ) {
    const data = await this.developersService.updateDeveloper(
      id,
      user.tenantId,
      dto,
    );

    return { success: true, data };
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.DEVELOPER_DELETE)
  async deleteDeveloper(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.developersService.deleteDeveloper(
      id,
      user.tenantId,
    );

    return { success: true, data };
  }
}
