/**
 * The plan as signed, frozen on the contract when it becomes ACTIVE.
 *
 * Resolution rules (see resolvePlanTerms):
 * - quotas come from the snapshot only — later plan edits never change them;
 * - feature flags present in the snapshot stay frozen;
 * - flags added to the plan after signing (absent from the snapshot) come
 *   from the live plan, so new features reach old contracts.
 *
 * `null` quota = unlimited, as on SubscriptionPlan. `maxStorageBytes` is a
 * decimal string because JSON cannot hold a BigInt.
 */
export const PLAN_SNAPSHOT_VERSION = 1 as const;

export type PlanSnapshotQuotas = {
  maxUsers: number | null;
  maxLeads: number | null;
  maxProjects: number | null;
  maxStorageBytes: string | null;
};

export type PlanSnapshotFeatureFlags = Record<string, boolean>;

export type PlanSnapshot = {
  version: typeof PLAN_SNAPSHOT_VERSION;
  planId: string;
  name: string;
  /** The contract's agreed price (not the plan's list price). */
  price: number | null;
  currency: string | null;
  quotas: PlanSnapshotQuotas;
  featureFlags: PlanSnapshotFeatureFlags;
  /** ISO timestamp; null only when a stored value was unreadable. */
  capturedAt: string | null;
};

export type PlanSnapshotPlanSource = {
  id: string;
  name: string;
  maxUsers: number | null;
  maxLeads: number | null;
  maxProjects: number | null;
  maxStorageBytes: bigint | number | string | null;
  featureFlags: unknown;
};

export type PlanSnapshotContractSource = {
  /** Prisma.Decimal, number or numeric string. */
  agreedPrice: { toString(): string } | number | string;
  currency: string;
};

export function buildPlanSnapshot(
  plan: PlanSnapshotPlanSource,
  contract: PlanSnapshotContractSource,
  capturedAt: Date = new Date(),
): PlanSnapshot {
  const price = Number(contract.agreedPrice.toString());

  return {
    version: PLAN_SNAPSHOT_VERSION,
    planId: plan.id,
    name: plan.name,
    price: Number.isFinite(price) ? price : null,
    currency: contract.currency,
    quotas: {
      maxUsers: plan.maxUsers,
      maxLeads: plan.maxLeads,
      maxProjects: plan.maxProjects,
      maxStorageBytes:
        plan.maxStorageBytes === null ? null : String(plan.maxStorageBytes),
    },
    featureFlags: parseFeatureFlagRecord(plan.featureFlags),
    capturedAt: capturedAt.toISOString(),
  };
}

export type PlanSnapshotIssueHandler = (issue: string) => void;

const QUOTA_KEYS = ['maxUsers', 'maxLeads', 'maxProjects'] as const;

/**
 * Reads a stored snapshot. Returns null only for "no snapshot" (legacy
 * contracts signed before snapshots). Anything malformed fails closed:
 * - an unreadable quota becomes 0 (blocked), never null (unlimited);
 * - an unreadable flags object means no frozen flags;
 * - a flag whose value is not a boolean is dropped.
 * Every problem is reported through `onIssue` so callers can log it.
 */
export function parsePlanSnapshot(
  raw: unknown,
  onIssue?: PlanSnapshotIssueHandler,
): PlanSnapshot | null {
  if (raw === null || raw === undefined) {
    return null;
  }

  const report = (issue: string) => onIssue?.(issue);

  if (!isPlainObject(raw)) {
    report('snapshot is not an object; all quotas blocked');
    return {
      version: PLAN_SNAPSHOT_VERSION,
      planId: '',
      name: '',
      price: null,
      currency: null,
      quotas: blockedQuotas(),
      featureFlags: {},
      capturedAt: null,
    };
  }

  if (raw.version !== PLAN_SNAPSHOT_VERSION) {
    report(`unsupported snapshot version ${String(raw.version)}`);
  }

  return {
    version: PLAN_SNAPSHOT_VERSION,
    planId: readString(raw.planId, 'planId', report) ?? '',
    name: readString(raw.name, 'name', report) ?? '',
    price: readPrice(raw.price, report),
    currency: readString(raw.currency, 'currency', report),
    quotas: readQuotas(raw.quotas, report),
    featureFlags: readFeatureFlags(raw.featureFlags, report),
    capturedAt: readString(raw.capturedAt, 'capturedAt', report),
  };
}

export type PlanTermsLivePlan = {
  maxUsers: number | null;
  maxLeads: number | null;
  maxProjects: number | null;
  maxStorageBytes: bigint | null;
  featureFlags: unknown;
};

export type ResolvedPlanTerms = {
  source: 'snapshot' | 'live';
  quotas: {
    maxUsers: number | null;
    maxLeads: number | null;
    maxProjects: number | null;
    maxStorageBytes: bigint | null;
  };
  featureFlags: PlanSnapshotFeatureFlags;
};

/**
 * Effective quotas and flags: frozen snapshot values first, live plan for
 * flags the snapshot doesn't know. Without a snapshot, the live plan.
 */
export function resolvePlanTerms(
  snapshot: PlanSnapshot | null,
  livePlan: PlanTermsLivePlan,
): ResolvedPlanTerms {
  const liveFlags = parseFeatureFlagRecord(livePlan.featureFlags);

  if (!snapshot) {
    return {
      source: 'live',
      quotas: {
        maxUsers: livePlan.maxUsers,
        maxLeads: livePlan.maxLeads,
        maxProjects: livePlan.maxProjects,
        maxStorageBytes: livePlan.maxStorageBytes,
      },
      featureFlags: liveFlags,
    };
  }

  return {
    source: 'snapshot',
    quotas: {
      maxUsers: snapshot.quotas.maxUsers,
      maxLeads: snapshot.quotas.maxLeads,
      maxProjects: snapshot.quotas.maxProjects,
      maxStorageBytes:
        snapshot.quotas.maxStorageBytes === null
          ? null
          : BigInt(snapshot.quotas.maxStorageBytes),
    },
    featureFlags: { ...liveFlags, ...snapshot.featureFlags },
  };
}

/** Boolean entries of a flags JSON value; anything else is ignored. */
export function parseFeatureFlagRecord(raw: unknown): PlanSnapshotFeatureFlags {
  if (!isPlainObject(raw)) {
    return {};
  }

  const flags: PlanSnapshotFeatureFlags = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'boolean') {
      flags[key] = value;
    }
  }
  return flags;
}

function readQuotas(
  raw: unknown,
  report: (issue: string) => void,
): PlanSnapshotQuotas {
  if (!isPlainObject(raw)) {
    report('quotas missing or not an object; all quotas blocked');
    return blockedQuotas();
  }

  const quotas = blockedQuotas();
  for (const key of QUOTA_KEYS) {
    quotas[key] = readCountQuota(raw[key], key, report);
  }
  quotas.maxStorageBytes = readStorageQuota(raw.maxStorageBytes, report);
  return quotas;
}

function readCountQuota(
  value: unknown,
  key: string,
  report: (issue: string) => void,
): number | null {
  if (value === null) {
    return null;
  }
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) {
    return value;
  }
  report(`quota ${key} is malformed (${describe(value)}); blocked`);
  return 0;
}

function readStorageQuota(
  value: unknown,
  report: (issue: string) => void,
): string | null {
  if (value === null) {
    return null;
  }
  if (typeof value === 'string' && /^\d{1,20}$/.test(value)) {
    return BigInt(value).toString();
  }
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) {
    return String(value);
  }
  report(`quota maxStorageBytes is malformed (${describe(value)}); blocked`);
  return '0';
}

function readFeatureFlags(
  raw: unknown,
  report: (issue: string) => void,
): PlanSnapshotFeatureFlags {
  if (!isPlainObject(raw)) {
    report('featureFlags missing or not an object; no frozen flags');
    return {};
  }

  const flags: PlanSnapshotFeatureFlags = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'boolean') {
      flags[key] = value;
    } else {
      report(`feature flag ${key} is not a boolean; dropped`);
    }
  }
  return flags;
}

function readPrice(
  value: unknown,
  report: (issue: string) => void,
): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  report(`price is malformed (${describe(value)})`);
  return null;
}

function readString(
  value: unknown,
  key: string,
  report: (issue: string) => void,
): string | null {
  if (typeof value === 'string') {
    return value;
  }
  report(`${key} is malformed (${describe(value)})`);
  return null;
}

function blockedQuotas(): PlanSnapshotQuotas {
  return { maxUsers: 0, maxLeads: 0, maxProjects: 0, maxStorageBytes: '0' };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function describe(value: unknown): string {
  if (value === undefined) return 'missing';
  if (value === null) return 'null';
  return typeof value;
}
