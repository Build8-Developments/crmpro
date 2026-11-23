import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ADMIN_PERMISSIONS } from '@crmpro/shared';
import type { Request } from 'express';
import {
  AdminPermissionsGuard,
  RequireAdminPermission,
} from '../../common/auth';
import { CurrentAdmin } from '../auth/decorators/current-admin.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedAdmin } from '../auth/auth.types';
import { extractRequestSecurityMetadata } from '../auth/utils/request-metadata.util';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { GetContractsQueryDto } from './dto/get-contracts-query.dto';
import { TerminateContractDto } from './dto/terminate-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';

@Controller('contracts')
@UseGuards(JwtAuthGuard, AdminPermissionsGuard)
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Get()
  @RequireAdminPermission(ADMIN_PERMISSIONS.CONTRACT_READ)
  async listContracts(@Query() query: GetContractsQueryDto) {
    const data = await this.contractsService.listContracts(query);
    return { success: true, data };
  }

  @Get(':id')
  @RequireAdminPermission(ADMIN_PERMISSIONS.CONTRACT_READ)
  async getContract(@Param('id', ParseUUIDPipe) id: string) {
    const contract = await this.contractsService.getContractById(id);
    return { success: true, data: contract };
  }

  @Post()
  @RequireAdminPermission(ADMIN_PERMISSIONS.CONTRACT_CREATE)
  async createContract(
    @Body() dto: CreateContractDto,
    @CurrentAdmin() actor: AuthenticatedAdmin,
    @Req() req: Request,
  ) {
    const contract = await this.contractsService.createContract(
      dto,
      actor.id,
      extractRequestSecurityMetadata(req),
    );
    return { success: true, data: contract };
  }

  @Patch(':id')
  @RequireAdminPermission(ADMIN_PERMISSIONS.CONTRACT_UPDATE)
  async updateContract(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContractDto,
    @CurrentAdmin() actor: AuthenticatedAdmin,
    @Req() req: Request,
  ) {
    const contract = await this.contractsService.updateContract(
      id,
      dto,
      actor.id,
      extractRequestSecurityMetadata(req),
    );
    return { success: true, data: contract };
  }

  @Post(':id/activate')
  @RequireAdminPermission(ADMIN_PERMISSIONS.CONTRACT_UPDATE)
  async activateContract(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAdmin() actor: AuthenticatedAdmin,
    @Req() req: Request,
  ) {
    const contract = await this.contractsService.activateContract(
      id,
      actor.id,
      extractRequestSecurityMetadata(req),
    );
    return { success: true, data: contract };
  }

  @Post(':id/terminate')
  @RequireAdminPermission(ADMIN_PERMISSIONS.CONTRACT_TERMINATE)
  async terminateContract(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TerminateContractDto,
    @CurrentAdmin() actor: AuthenticatedAdmin,
    @Req() req: Request,
  ) {
    const contract = await this.contractsService.terminateContract(
      id,
      dto,
      actor.id,
      extractRequestSecurityMetadata(req),
    );
    return { success: true, data: contract };
  }

  @Post(':id/archive')
  @RequireAdminPermission(ADMIN_PERMISSIONS.CONTRACT_UPDATE)
  async archiveContract(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAdmin() actor: AuthenticatedAdmin,
    @Req() req: Request,
  ) {
    const data = await this.contractsService.archiveContract(
      id,
      actor.id,
      extractRequestSecurityMetadata(req),
    );
    return { success: true, data };
  }
}
