import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@crmpro/database';
import {
  buildPaginatedResponse,
  getPaginationParams,
  PaginatedResponse,
} from '../../common/pagination';
import { QuotaService } from '../../common/quota/quota.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  buildOrderBy,
  normalizeSearch,
  SortOrder,
} from '../../common/query';
import {
  normalizeDisplayName,
  normalizeNameForComparison,
} from '../../common/utils/name-normalization.util';
import { CreateProjectDto } from './dto/create-project.dto';
import { GetProjectsQueryDto } from './dto/get-projects-query.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectResponse } from './types/project.types';

const PROJECT_SORT_FIELDS = [
  'name',
  'createdAt',
  'updatedAt',
  'isActive',
] as const;

const PROJECT_SORT_CONFIG = {
  allowedFields: PROJECT_SORT_FIELDS,
  defaultField: 'name' as const,
  defaultOrder: SortOrder.ASC,
};

const projectSelect = {
  id: true,
  name: true,
  location: true,
  isActive: true,
  developer: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.ProjectSelect;

type ProjectRecord = Prisma.ProjectGetPayload<{ select: typeof projectSelect }>;

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly quotaService: QuotaService,
  ) {}

  async listProjects(
    tenantId: string,
    query: GetProjectsQueryDto,
  ): Promise<PaginatedResponse<ProjectResponse>> {
    const { page, limit, skip, take } = getPaginationParams(query);
    const where = this.buildWhereClause(tenantId, query);
    const orderBy = this.buildOrderBy(query);

    const [projects, totalItems] = await this.prisma.$transaction([
      this.prisma.project.findMany({
        where,
        orderBy,
        select: projectSelect,
        skip,
        take,
      }),
      this.prisma.project.count({ where }),
    ]);

    return buildPaginatedResponse(
      projects.map((project) => this.toProjectResponse(project)),
      page,
      limit,
      totalItems,
    );
  }

  async getProject(id: string, tenantId: string): Promise<ProjectResponse> {
    const project = await this.getProjectOrThrow(id, tenantId);
    return this.toProjectResponse(project);
  }

  async createProject(
    tenantId: string,
    dto: CreateProjectDto,
  ): Promise<ProjectResponse> {
    await this.getDeveloperOrThrow(dto.developerId, tenantId);

    const name = this.normalizeName(dto.name);
    await this.ensureNameUnique(name, tenantId);

    try {
      const project = await this.prisma.$transaction(async (tx) => {
        await this.quotaService.assertCanCreateProjectInTransaction(
          tx,
          tenantId,
        );

        return tx.project.create({
          data: {
            tenantId,
            developerId: dto.developerId,
            name,
            location: this.normalizeLocation(dto.location),
            isActive: true,
          },
          select: projectSelect,
        });
      });

      return this.toProjectResponse(project);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async updateProject(
    id: string,
    tenantId: string,
    dto: UpdateProjectDto,
  ): Promise<ProjectResponse> {
    const project = await this.getProjectOrThrow(id, tenantId);

    const developerId = dto.developerId ?? project.developer.id;
    if (dto.developerId !== undefined) {
      await this.getDeveloperOrThrow(developerId, tenantId);
    }

    const name =
      dto.name !== undefined ? this.normalizeName(dto.name) : project.name;

    if (dto.name !== undefined) {
      await this.ensureNameUnique(name, tenantId, project.id);
    }

    const location =
      dto.location !== undefined
        ? this.normalizeLocation(dto.location)
        : project.location;

    try {
      const updated = await this.prisma.project.update({
        where: { id: project.id },
        data: {
          ...(dto.developerId !== undefined ? { developerId } : {}),
          ...(dto.name !== undefined ? { name } : {}),
          ...(dto.location !== undefined ? { location } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
        select: projectSelect,
      });

      return this.toProjectResponse(updated);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async deleteProject(
    id: string,
    tenantId: string,
  ): Promise<{ id: string }> {
    const project = await this.getProjectOrThrow(id, tenantId);

    await this.prisma.project.update({
      where: { id: project.id },
      data: { deletedAt: new Date() },
    });

    return { id: project.id };
  }

  private buildWhereClause(
    tenantId: string,
    query: GetProjectsQueryDto,
  ): Prisma.ProjectWhereInput {
    const search = normalizeSearch(query.search);

    return {
      tenantId,
      deletedAt: null,
      ...(query.developerId ? { developerId: query.developerId } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { location: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };
  }

  private buildOrderBy(
    query: GetProjectsQueryDto,
  ): Prisma.ProjectOrderByWithRelationInput {
    return buildOrderBy(query.sortBy, query.sortOrder, PROJECT_SORT_CONFIG);
  }

  private async getProjectOrThrow(
    id: string,
    tenantId: string,
  ): Promise<ProjectRecord> {
    const project = await this.prisma.project.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: projectSelect,
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  private async getDeveloperOrThrow(developerId: string, tenantId: string) {
    const developer = await this.prisma.developer.findFirst({
      where: { id: developerId, tenantId, deletedAt: null },
      select: { id: true },
    });

    if (!developer) {
      throw new BadRequestException('Developer not found');
    }

    return developer;
  }

  private normalizeName(name: string): string {
    return normalizeDisplayName(name);
  }

  private normalizeLocation(location?: string | null): string | null {
    if (location === undefined || location === null) {
      return null;
    }

    const trimmed = location.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private async ensureNameUnique(
    name: string,
    tenantId: string,
    excludeId?: string,
  ): Promise<void> {
    const normalized = normalizeNameForComparison(name);

    const projects = await this.prisma.project.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true, name: true },
    });

    const duplicate = projects.find(
      (project) => normalizeNameForComparison(project.name) === normalized,
    );

    if (duplicate) {
      throw new BadRequestException('A project with this name already exists');
    }
  }

  private toProjectResponse(project: ProjectRecord): ProjectResponse {
    return {
      id: project.id,
      name: project.name,
      location: project.location,
      isActive: project.isActive,
      developer: project.developer,
    };
  }

  private handlePrismaError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new BadRequestException('A project with this name already exists');
    }

    throw error;
  }
}
