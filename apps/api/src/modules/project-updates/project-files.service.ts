import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PROJECT_FILES_LIMIT } from './project-updates.constants';

export interface ProjectFileResponse {
  id: string;
  category: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: string;
  projectId: string;
  createdAt: string;
  uploadedBy: { id: string; fullName: string };
}

/**
 * Read-only list of a project's own documents (brochures, price sheets) for
 * the project drawer. Downloads and previews go through /files/:id/*.
 * Files on a lead or inside a gallery folder are left out: their visibility
 * rules (lead scope, private folders) live in the files module.
 */
@Injectable()
export class ProjectFilesService {
  constructor(private readonly prisma: PrismaService) {}

  async listForProject(
    tenantId: string,
    projectId: string,
  ): Promise<ProjectFileResponse[]> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId, deletedAt: null },
      select: { id: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const files = await this.prisma.fileAsset.findMany({
      where: {
        tenantId,
        projectId: project.id,
        deletedAt: null,
        leadId: null,
        folderId: null,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: PROJECT_FILES_LIMIT,
      select: {
        id: true,
        category: true,
        originalFilename: true,
        mimeType: true,
        sizeBytes: true,
        createdAt: true,
        uploadedBy: { select: { id: true, name: true } },
      },
    });

    return files.map((file) => ({
      id: file.id,
      category: file.category,
      originalFilename: file.originalFilename,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes.toString(),
      projectId: project.id,
      createdAt: file.createdAt.toISOString(),
      uploadedBy: { id: file.uploadedBy.id, fullName: file.uploadedBy.name },
    }));
  }
}
