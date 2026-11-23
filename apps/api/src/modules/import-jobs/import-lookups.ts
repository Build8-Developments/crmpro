import { isAssigneeInScope, type LeadScope } from '../../common/auth';
import { PrismaService } from '../../common/prisma/prisma.service';
import { normalizeLookupKey, splitImportedList } from './mapping/import-values';

interface LookupUser {
  id: string;
  name: string;
  email: string;
}

/**
 * Per-job name lookups (sources, projects, agents) loaded once so a 20k-row
 * file does not hit the database for every cell. Unknown names resolve to
 * nothing (the row falls back to the job defaults); nothing is created.
 */
export class ImportLookups {
  private readonly sources = new Map<string, string>();
  private readonly projects = new Map<string, string>();
  private readonly usersByEmail = new Map<string, LookupUser>();
  /** null = two active users share the name: never guess. */
  private readonly usersByName = new Map<string, LookupUser | null>();

  private constructor(private readonly scope: LeadScope) {}

  static async load(
    prisma: PrismaService,
    tenantId: string,
    options: { scope: LeadScope; includeUsers: boolean },
  ): Promise<ImportLookups> {
    const lookups = new ImportLookups(options.scope);
    const [sources, projects, users] = await Promise.all([
      prisma.leadSource.findMany({
        where: { tenantId },
        select: { id: true, name: true },
      }),
      prisma.project.findMany({
        where: { tenantId, deletedAt: null },
        select: { id: true, name: true },
      }),
      options.includeUsers
        ? prisma.user.findMany({
            where: { tenantId, isActive: true, deletedAt: null },
            select: { id: true, name: true, email: true },
          })
        : Promise.resolve([] as LookupUser[]),
    ]);

    for (const source of sources) {
      lookups.sources.set(normalizeLookupKey(source.name), source.id);
    }
    for (const project of projects) {
      lookups.projects.set(normalizeLookupKey(project.name), project.id);
    }
    for (const user of users) {
      lookups.usersByEmail.set(user.email.trim().toLowerCase(), user);
      const nameKey = normalizeLookupKey(user.name);
      lookups.usersByName.set(
        nameKey,
        lookups.usersByName.has(nameKey) ? null : user,
      );
    }

    return lookups;
  }

  /** Existing source by name (case/Arabic-variant insensitive). */
  resolveSourceId(name: string): string | null {
    const key = normalizeLookupKey(name);
    return key ? (this.sources.get(key) ?? null) : null;
  }

  /** Known project names in the cell ("A, B ، C / D | E"). */
  resolveProjectIds(value: string): string[] {
    const ids = splitImportedList(value)
      .map((name) => this.projects.get(normalizeLookupKey(name)))
      .filter((id): id is string => Boolean(id));
    return [...new Set(ids)];
  }

  /** Names in the cell that match no project. */
  unknownProjectNames(value: string): string[] {
    return splitImportedList(value).filter(
      (name) => !this.projects.has(normalizeLookupKey(name)),
    );
  }

  /**
   * Active user by email or unique name, inside the importer's scope;
   * anything else resolves to null.
   */
  resolveAssigneeId(value: string): string | null {
    const raw = value.trim();
    if (raw.length === 0) return null;

    const user =
      this.usersByEmail.get(raw.toLowerCase()) ??
      this.usersByName.get(normalizeLookupKey(raw)) ??
      null;
    if (!user || !isAssigneeInScope(this.scope, user.id)) return null;
    return user.id;
  }
}
