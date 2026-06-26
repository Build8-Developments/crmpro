import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PipelineCloseType, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreatePipelineDto } from './dto/create-pipeline.dto';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdatePipelineDto } from './dto/update-pipeline.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import {
  PipelineResponse,
  PipelineStageResponse,
} from './types/pipeline.types';

type TransactionClient = Prisma.TransactionClient;

interface ClosedStageInput {
  isClosed: boolean;
  closeType: PipelineCloseType | null | undefined;
}

const DEFAULT_STAGE_DEFS = [
  { name: 'New Lead', color: '#94a3b8', isClosed: false, closeType: null },
  { name: 'Contacted', color: '#60a5fa', isClosed: false, closeType: null },
  { name: 'Qualified', color: '#818cf8', isClosed: false, closeType: null },
  { name: 'Interested', color: '#a78bfa', isClosed: false, closeType: null },
  { name: 'Negotiation', color: '#f59e0b', isClosed: false, closeType: null },
  {
    name: 'Won',
    color: '#22c55e',
    isClosed: true,
    closeType: PipelineCloseType.WON,
  },
  {
    name: 'Lost',
    color: '#ef4444',
    isClosed: true,
    closeType: PipelineCloseType.LOST,
  },
] as const;

const pipelineInclude = {
  stages: {
    orderBy: { sortOrder: 'asc' as const },
  },
} satisfies Prisma.PipelineInclude;

@Injectable()
export class PipelinesService {
  constructor(private readonly prisma: PrismaService) {}

  async listPipelines(tenantId: string): Promise<PipelineResponse[]> {
    const pipelines = await this.prisma.pipeline.findMany({
      where: { tenantId },
      include: pipelineInclude,
      orderBy: { createdAt: 'asc' },
    });

    return pipelines.map((pipeline) => this.toPipelineResponse(pipeline));
  }

  async getPipeline(
    id: string,
    tenantId: string,
  ): Promise<PipelineResponse> {
    const pipeline = await this.getPipelineOrThrow(id, tenantId);
    return this.toPipelineResponse(pipeline);
  }

  async createPipeline(
    tenantId: string,
    dto: CreatePipelineDto,
  ): Promise<PipelineResponse> {
    const existingPipelineCount = await this.prisma.pipeline.count({
      where: { tenantId },
    });

    const shouldBeDefault =
      dto.isDefault === true || existingPipelineCount === 0;

    try {
      const pipeline = await this.prisma.$transaction(async (tx) => {
        if (shouldBeDefault) {
          await this.unsetExistingDefaultPipeline(tx, tenantId);
        }

        const created = await tx.pipeline.create({
          data: {
            tenantId,
            name: dto.name.trim(),
            isDefault: shouldBeDefault,
          },
        });

        await tx.pipelineStage.createMany({
          data: DEFAULT_STAGE_DEFS.map((stage, index) => ({
            tenantId,
            pipelineId: created.id,
            name: stage.name,
            color: stage.color,
            sortOrder: index + 1,
            isSystem: true,
            isClosed: stage.isClosed,
            closeType: stage.closeType,
          })),
        });

        return tx.pipeline.findUniqueOrThrow({
          where: { id: created.id },
          include: pipelineInclude,
        });
      });

      return this.toPipelineResponse(pipeline);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async updatePipeline(
    id: string,
    tenantId: string,
    dto: UpdatePipelineDto,
  ): Promise<PipelineResponse> {
    const pipeline = await this.getPipelineOrThrow(id, tenantId);

    if (dto.isDefault === false && pipeline.isDefault) {
      throw new BadRequestException(
        'Cannot unset the default pipeline; set another pipeline as default first',
      );
    }

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        if (dto.isDefault === true && !pipeline.isDefault) {
          await this.unsetExistingDefaultPipeline(tx, tenantId);
        }

        return tx.pipeline.update({
          where: { id: pipeline.id },
          data: {
            ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
            ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
          },
          include: pipelineInclude,
        });
      });

      return this.toPipelineResponse(updated);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async deletePipeline(id: string, tenantId: string): Promise<void> {
    const pipeline = await this.getPipelineOrThrow(id, tenantId);
    await this.ensurePipelineCanBeDeleted(pipeline);

    await this.prisma.pipeline.delete({
      where: { id: pipeline.id },
    });
  }

  async createStage(
    pipelineId: string,
    tenantId: string,
    dto: CreateStageDto,
  ): Promise<PipelineStageResponse> {
    const pipeline = await this.getPipelineOrThrow(pipelineId, tenantId);

    const isClosed = dto.isClosed ?? false;
    const closeType = isClosed ? (dto.closeType ?? null) : null;

    this.validateClosedStageRules({ isClosed, closeType });

    await this.ensureUniqueSortOrder(pipeline.id, dto.sortOrder);
    if (closeType) {
      await this.ensureUniqueClosedStage(pipeline.id, closeType);
    }

    try {
      const stage = await this.prisma.pipelineStage.create({
        data: {
          tenantId: pipeline.tenantId,
          pipelineId: pipeline.id,
          name: dto.name.trim(),
          sortOrder: dto.sortOrder,
          color: dto.color ?? null,
          isClosed,
          closeType,
          isSystem: false,
        },
      });

      return this.toStageResponse(stage);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async updateStage(
    pipelineId: string,
    stageId: string,
    tenantId: string,
    dto: UpdateStageDto,
  ): Promise<PipelineStageResponse> {
    const stage = await this.getStageOrThrow(stageId, pipelineId, tenantId);

    const nextName = dto.name !== undefined ? dto.name.trim() : stage.name;
    const nextSortOrder =
      dto.sortOrder !== undefined ? dto.sortOrder : stage.sortOrder;
    const nextColor = dto.color !== undefined ? dto.color : stage.color;
    const nextIsClosed =
      dto.isClosed !== undefined ? dto.isClosed : stage.isClosed;
    let nextCloseType =
      dto.closeType !== undefined ? dto.closeType : stage.closeType;

    if (!nextIsClosed) {
      nextCloseType = null;
    }

    this.validateClosedStageRules({
      isClosed: nextIsClosed,
      closeType: nextCloseType,
    });

    if (nextSortOrder !== stage.sortOrder) {
      await this.ensureUniqueSortOrder(
        pipelineId,
        nextSortOrder,
        stage.id,
      );
    }

    if (nextCloseType) {
      await this.ensureUniqueClosedStage(
        pipelineId,
        nextCloseType,
        stage.id,
      );
    }

    try {
      const updated = await this.prisma.pipelineStage.update({
        where: { id: stage.id },
        data: {
          name: nextName,
          sortOrder: nextSortOrder,
          color: nextColor,
          isClosed: nextIsClosed,
          closeType: nextCloseType,
        },
      });

      return this.toStageResponse(updated);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async deleteStage(
    pipelineId: string,
    stageId: string,
    tenantId: string,
  ): Promise<void> {
    const stage = await this.getStageOrThrow(stageId, pipelineId, tenantId);

    const stageCount = await this.prisma.pipelineStage.count({
      where: { pipelineId },
    });

    if (stageCount <= 1) {
      throw new BadRequestException('Cannot delete the last stage of a pipeline');
    }

    const leadsUsingStage = await this.prisma.lead.count({
      where: { pipelineStageId: stage.id },
    });

    if (leadsUsingStage > 0) {
      throw new BadRequestException(
        'Cannot delete a stage that is in use by leads',
      );
    }

    await this.prisma.pipelineStage.delete({
      where: { id: stage.id },
    });
  }

  private async getPipelineOrThrow(id: string, tenantId: string) {
    const pipeline = await this.prisma.pipeline.findFirst({
      where: { id, tenantId },
      include: pipelineInclude,
    });

    if (!pipeline) {
      throw new NotFoundException('Pipeline not found');
    }

    return pipeline;
  }

  private async getStageOrThrow(
    stageId: string,
    pipelineId: string,
    tenantId: string,
  ) {
    const stage = await this.prisma.pipelineStage.findFirst({
      where: {
        id: stageId,
        pipelineId,
        tenantId,
      },
    });

    if (!stage) {
      throw new NotFoundException('Pipeline stage not found');
    }

    return stage;
  }

  private validateClosedStageRules(input: ClosedStageInput): void {
    const closeType = input.closeType ?? null;

    if (!input.isClosed && closeType !== null) {
      throw new BadRequestException(
        'closeType must be null when isClosed is false',
      );
    }

    if (input.isClosed && closeType === null) {
      throw new BadRequestException(
        'closeType is required when isClosed is true',
      );
    }
  }

  private async ensureUniqueClosedStage(
    pipelineId: string,
    closeType: PipelineCloseType,
    excludeStageId?: string,
  ): Promise<void> {
    const existing = await this.prisma.pipelineStage.findFirst({
      where: {
        pipelineId,
        closeType,
        ...(excludeStageId ? { id: { not: excludeStageId } } : {}),
      },
      select: { id: true, name: true },
    });

    if (existing) {
      throw new BadRequestException(
        `Pipeline already has a ${closeType} stage`,
      );
    }
  }

  private async ensureUniqueSortOrder(
    pipelineId: string,
    sortOrder: number,
    excludeStageId?: string,
  ): Promise<void> {
    const existing = await this.prisma.pipelineStage.findFirst({
      where: {
        pipelineId,
        sortOrder,
        ...(excludeStageId ? { id: { not: excludeStageId } } : {}),
      },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException(
        `sortOrder ${sortOrder} is already used in this pipeline`,
      );
    }
  }

  private async ensurePipelineCanBeDeleted(pipeline: {
    id: string;
    isDefault: boolean;
  }): Promise<void> {
    if (pipeline.isDefault) {
      throw new BadRequestException('Cannot delete the default pipeline');
    }

    const leadCount = await this.prisma.lead.count({
      where: { pipelineId: pipeline.id },
    });

    if (leadCount > 0) {
      throw new BadRequestException(
        'Cannot delete a pipeline that has leads',
      );
    }
  }

  private async unsetExistingDefaultPipeline(
    tx: TransactionClient,
    tenantId: string,
  ): Promise<void> {
    await tx.pipeline.updateMany({
      where: { tenantId, isDefault: true },
      data: { isDefault: false },
    });
  }

  private toPipelineResponse(
    pipeline: Prisma.PipelineGetPayload<{ include: typeof pipelineInclude }>,
  ): PipelineResponse {
    return {
      id: pipeline.id,
      name: pipeline.name,
      isDefault: pipeline.isDefault,
      createdAt: pipeline.createdAt,
      updatedAt: pipeline.updatedAt,
      stages: pipeline.stages.map((stage) => this.toStageResponse(stage)),
    };
  }

  private toStageResponse(stage: {
    id: string;
    name: string;
    sortOrder: number;
    color: string | null;
    isSystem: boolean;
    isClosed: boolean;
    closeType: PipelineCloseType | null;
  }): PipelineStageResponse {
    return {
      id: stage.id,
      name: stage.name,
      sortOrder: stage.sortOrder,
      color: stage.color,
      isSystem: stage.isSystem,
      isClosed: stage.isClosed,
      closeType: stage.closeType,
    };
  }

  private handlePrismaError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new BadRequestException('A unique constraint was violated');
    }

    throw error;
  }
}
