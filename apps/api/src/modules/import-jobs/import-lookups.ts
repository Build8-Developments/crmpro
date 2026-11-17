import { PrismaService } from '../../common/prisma/prisma.service';
import {
  isAssigneeInScope,
  type LeadScope,
} from '../leads/scope/lead-scope.types';
import { MAX_NEW_SOURCES_PER_IMPORT } from './import-jobs.constants';
import { splitImportedList } from './mapping/import-values';

interface ImportUser {
  id: string;
  name: string;
  email: string;
}

/**
 * Per-job lookups (sources, agents, projects) loaded once so a 10k-row file
 * does not hit the database for every cell.
 */
export class ImportLookups {
  private readonly sources = new Map<string, string>();
  private readonly projects = new Map<string, string>();
  private usersByEmail = new Map<string, ImportUser>();
  private usersByName = new Map<string, ImportUser | null>();
  private createdSources = 0;

  private constructor(
    private readonly prisma: PrismaService,
    private readonly tenantId: string,
    private readonly scope: LeadScope,
  ) {}

  static async load(
    prisma: PrismaService,
    tenantId: string,
    scope: LeadScope,
  ): Promise<ImportLookups> {
    const lookups = new ImportLookups(prisma, tenantId, scope);
    const [sources, projects, users] = await Promise.all([
      prisma.leadSource.findMany({
        where: { tenantId },
        select: { id: true, name: true },
      }),
      prisma.project.findMany({
        where: { tenantId, deletedAt: null },
        select: { id: true, name: true },
      }),
      prisma.user.findMany({
        where: { tenantId, isActive: true, deletedAt: null },
        select: { id: true, name: true, email: true },
      }),
    ]);

    for (const source of sources) {
      lookups.sources.set(source.name.trim().toLowerCase(), source.id);
    }
    for (const project of projects) {
      lookups.projects.set(project.name.trim().toLowerCase(), project.id);
    }
    for (const user of users) {
      lookups.usersByEmail.set(user.email.toLowerCase(), user);
      const nameKey = user.name.trim().toLowerCase();
      // Ambiguous names (two "Ahmed Ali") never match.
      lookups.usersByName.set(
        nameKey,
        lookups.usersByName.has(nameKey) ? null : user,
      );
    }

    return lookups;
  }

  /** Matches by name (case-insensitive); unknown names become new sources. */
  async resolveSourceId(name: string): Promise<string | null> {
    const trimmed = name.trim().replace(/\s+/g, ' ');
    if (trimmed.length === 0) return null;

    const key = trimmed.toLowerCase();
    const existing = this.sources.get(key);
    if (existing) return existing;

    if (
      this.createdSources >= MAX_NEW_SOURCES_PER_IMPORT ||
      trimmed.length > 80
    ) {
      return null;
    }

    const source = await this.prisma.leadSource.upsert({
      where: { tenantId_name: { tenantId: this.tenantId, name: trimmed } },
      update: {},
      create: { tenantId: this.tenantId, name: trimmed },
      select: { id: true },
    });
    this.createdSources += 1;
    this.sources.set(key, source.id);
    return source.id;
  }

  /**
   * Email or exact (unique) name of an active user inside the importer's
   * scope; anything else returns null so the lead falls back to the default.
   */
  resolveAssigneeId(value: string): string | null {
    const key = value.trim().toLowerCase();
    if (key.length === 0) return null;

    const user =
      this.usersByEmail.get(key) ?? this.usersByName.get(key) ?? null;
    if (!user || !isAssigneeInScope(this.scope, user.id)) {
      return null;
    }

    return user.id;
  }

  /** Known project names in the cell; unknown names are ignored. */
  resolveProjectIds(value: string): string[] {
    return splitImportedList(value)
      .map((name) => this.projects.get(name.toLowerCase()))
      .filter((id): id is string => Boolean(id));
  }
}
