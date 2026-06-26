import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  buildPaginatedResponse,
  getPaginationParams,
  PaginatedResponse,
} from '../../common/pagination';
import {
  buildOrderBy,
  normalizeSearch,
  SortOrder,
} from '../../common/query';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  normalizeDisplayName,
  normalizeNameForComparison,
} from '../../common/utils/name-normalization.util';
import { CreateDeveloperDto } from './dto/create-developer.dto';
import { GetDevelopersQueryDto } from './dto/get-developers-query.dto';
import { UpdateDeveloperDto } from './dto/update-developer.dto';
import { DeveloperResponse } from './types/developer.types';

const DEVELOPER_SORT_FIELDS = ['name', 'createdAt', 'updatedAt'] as const;

const DEVELOPER_SORT_CONFIG = {
  allowedFields: DEVELOPER_SORT_FIELDS,
  defaultField: 'name' as const,
  defaultOrder: SortOrder.ASC,
};

const developerSelect = {
  id: true,
  name: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.DeveloperSelect;

@Injectable()
export class DevelopersService {
  constructor(private readonly prisma: PrismaService) {}

  async listDevelopers(
    tenantId: string,
    query: GetDevelopersQueryDto,
  ): Promise<PaginatedResponse<DeveloperResponse>> {
    const { page, limit, skip, take } = getPaginationParams(query);
    const where = this.buildWhereClause(tenantId, query);
    const orderBy = this.buildOrderBy(query);

    const [developers, totalItems] = await this.prisma.$transaction([
      this.prisma.developer.findMany({
        where,
        orderBy,
        select: developerSelect,
        skip,
        take,
      }),
      this.prisma.developer.count({ where }),
    ]);

    return buildPaginatedResponse(developers, page, limit, totalItems);
  }

  async getDeveloper(
    id: string,
    tenantId: string,
  ): Promise<DeveloperResponse> {
    const developer = await this.getDeveloperOrThrow(id, tenantId);
    return developer;
  }

  async createDeveloper(
    tenantId: string,
    dto: CreateDeveloperDto,
  ): Promise<DeveloperResponse> {
    const name = this.normalizeName(dto.name);
    await this.ensureNameUnique(name, tenantId);

    try {
      return await this.prisma.developer.create({
        data: { tenantId, name },
        select: developerSelect,
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async updateDeveloper(
    id: string,
    tenantId: string,
    dto: UpdateDeveloperDto,
  ): Promise<DeveloperResponse> {
    const developer = await this.getDeveloperOrThrow(id, tenantId);
    const name = this.normalizeName(dto.name);
    await this.ensureNameUnique(name, tenantId, developer.id);

    try {
      return await this.prisma.developer.update({
        where: { id: developer.id },
        data: { name },
        select: developerSelect,
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async deleteDeveloper(
    id: string,
    tenantId: string,
  ): Promise<{ id: string }> {
    const developer = await this.getDeveloperOrThrow(id, tenantId);
    await this.ensureCanDelete(developer.id);

    await this.prisma.developer.update({
      where: { id: developer.id },
      data: { deletedAt: new Date() },
    });

    return { id: developer.id };
  }

  private buildWhereClause(
    tenantId: string,
    query: GetDevelopersQueryDto,
  ): Prisma.DeveloperWhereInput {
    const search = normalizeSearch(query.search);

    return {
      tenantId,
      deletedAt: null,
      ...(search && {
        name: {
          contains: search,
          mode: 'insensitive',
        },
      }),
    };
  }

  private buildOrderBy(
    query: GetDevelopersQueryDto,
  ): Prisma.DeveloperOrderByWithRelationInput {
    return buildOrderBy(
      query.sortBy,
      query.sortOrder,
      DEVELOPER_SORT_CONFIG,
    );
  }

  private async getDeveloperOrThrow(id: string, tenantId: string) {
    const developer = await this.prisma.developer.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: developerSelect,
    });

    if (!developer) {
      throw new NotFoundException('Developer not found');
    }

    return developer;
  }

  private normalizeName(name: string): string {
    return normalizeDisplayName(name);
  }

  private async ensureNameUnique(
    name: string,
    tenantId: string,
    excludeId?: string,
  ): Promise<void> {
    const normalized = normalizeNameForComparison(name);

    const developers = await this.prisma.developer.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true, name: true },
    });

    const duplicate = developers.find(
      (developer) => normalizeNameForComparison(developer.name) === normalized,
    );

    if (duplicate) {
      throw new BadRequestException(
        'A developer with this name already exists',
      );
    }
  }

  private async ensureCanDelete(id: string): Promise<void> {
    const activeProjectCount = await this.prisma.project.count({
      where: {
        developerId: id,
        deletedAt: null,
      },
    });

    if (activeProjectCount > 0) {
      throw new BadRequestException(
        'Cannot delete developer with active projects',
      );
    }
  }

  private handlePrismaError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new BadRequestException(
        'A developer with this name already exists',
      );
    }

    throw error;
  }
}
