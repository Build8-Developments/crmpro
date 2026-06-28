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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { PERMISSIONS } from '@crmpro/shared/auth';
import { PermissionsGuard, RequirePermission } from '../../common/auth';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { AutomationService } from './automation.service';
import { CreateAutomationDto } from './dto/create-automation.dto';
import { GetAutomationsQueryDto } from './dto/get-automations-query.dto';
import { GetExecutionsQueryDto } from './dto/get-executions-query.dto';
import { TestAutomationDto } from './dto/test-automation.dto';
import { UpdateAutomationDto } from './dto/update-automation.dto';

@ApiTags('Automations')
@ApiBearerAuth()
@Controller('automations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AutomationController {
  constructor(private readonly automationService: AutomationService) {}

  @Get()
  @RequirePermission(PERMISSIONS.AUTOMATION_READ)
  @ApiOperation({ summary: 'List automation workflows' })
  async listAutomations(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetAutomationsQueryDto,
  ) {
    const data = await this.automationService.listAutomations(
      user.tenantId,
      query,
    );
    return { success: true, data };
  }

  @Post()
  @RequirePermission(PERMISSIONS.AUTOMATION_CREATE)
  @ApiOperation({ summary: 'Create automation workflow' })
  async createAutomation(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAutomationDto,
  ) {
    const data = await this.automationService.createAutomation(
      user.tenantId,
      user.id,
      dto,
    );
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.AUTOMATION_READ)
  @ApiOperation({ summary: 'Get automation workflow by ID' })
  async getAutomation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.automationService.getAutomation(user.tenantId, id);
    return { success: true, data };
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.AUTOMATION_UPDATE)
  @ApiOperation({ summary: 'Update automation workflow' })
  async updateAutomation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAutomationDto,
  ) {
    const data = await this.automationService.updateAutomation(
      user.tenantId,
      id,
      dto,
    );
    return { success: true, data };
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.AUTOMATION_DELETE)
  @ApiOperation({ summary: 'Soft delete automation workflow' })
  async deleteAutomation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.automationService.deleteAutomation(
      user.tenantId,
      id,
    );
    return { success: true, data };
  }

  @Post(':id/enable')
  @RequirePermission(PERMISSIONS.AUTOMATION_UPDATE)
  @ApiOperation({ summary: 'Enable automation workflow' })
  async enableAutomation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.automationService.enableAutomation(
      user.tenantId,
      id,
    );
    return { success: true, data };
  }

  @Post(':id/disable')
  @RequirePermission(PERMISSIONS.AUTOMATION_UPDATE)
  @ApiOperation({ summary: 'Disable automation workflow' })
  async disableAutomation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.automationService.disableAutomation(
      user.tenantId,
      id,
    );
    return { success: true, data };
  }

  @Post(':id/test')
  @RequirePermission(PERMISSIONS.AUTOMATION_EXECUTE)
  @ApiOperation({ summary: 'Test automation workflow without side effects' })
  async testAutomation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TestAutomationDto,
  ) {
    const data = await this.automationService.testAutomation(
      user.tenantId,
      id,
      dto,
    );
    return { success: true, data };
  }

  @Get(':id/executions')
  @RequirePermission(PERMISSIONS.AUTOMATION_READ)
  @ApiOperation({ summary: 'List automation execution history' })
  async listExecutions(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: GetExecutionsQueryDto,
  ) {
    const data = await this.automationService.listExecutions(
      user.tenantId,
      id,
      query,
    );
    return { success: true, data };
  }
}
