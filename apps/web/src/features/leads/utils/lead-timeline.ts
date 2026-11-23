import {
  CONTACT_ACCESS_LABELS,
  CONTACT_FIELD_LABELS,
  type ContactAccessAction,
  type ContactField,
  CHANNEL_LABELS,
  OUTCOME_LABELS,
  TASK_TYPE_LABELS,
  type InteractionChannel,
  type InteractionOutcome,
  type TaskType,
} from "@crmpro/shared";
import type { LeadTimelineActivity } from "@/features/leads/types";
import { formatDue } from "@/features/leads/components/workflow-visuals";
import { formatMergeCounts } from "@/features/leads/utils/lead-merge";
import { formatMoney } from "@/lib/format";

export type TimelineTone = "default" | "positive" | "negative" | "muted" | "accent";

export interface TimelineEntry {
  title: string;
  detail: string | null;
  tone: TimelineTone;
  kind:
    | "created"
    | "assignment"
    | "stage"
    | "note"
    | "project"
    | "interaction"
    | "task"
    | "status"
    | "file"
    | "contact"
    | "merge"
    | "deal"
    | "other";
  channel?: InteractionChannel;
}

type Meta = Record<string, unknown>;

function str(meta: Meta, key: string): string | null {
  const value = meta[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function num(meta: Meta, key: string): number | null {
  const value = meta[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function dealPrice(meta: Meta): string | null {
  const price = num(meta, "price");
  return price === null ? null : formatMoney(price, str(meta, "currency") ?? "EGP");
}

const DEAL_FIELD_LABELS: Record<string, string> = {
  projectId: "project",
  unitType: "unit type",
  unitCode: "unit code",
  price: "price",
  downPaymentPct: "down payment",
  paymentPlan: "payment plan",
  commissionPct: "commission %",
  commissionAmount: "commission",
  agentId: "agent",
  reservedAt: "reservation date",
  contractedAt: "contract date",
  notes: "notes",
};

/** Human sentence for one lead timeline event. */
export function describeLeadActivity(activity: LeadTimelineActivity): TimelineEntry {
  const meta = (activity.metadata ?? {}) as Meta;

  switch (activity.eventType) {
    case "LEAD_CREATED": {
      const origin = str(meta, "source");
      const from =
        origin === "inbound"
          ? `From ${str(meta, "apiKeyName") ?? "an integration"}`
          : origin === "import"
            ? "From an import"
            : origin
              ? `From ${origin}`
              : null;
      const unmatched = [
        str(meta, "submittedSource") && `source “${str(meta, "submittedSource")}”`,
        str(meta, "submittedProject") && `project “${str(meta, "submittedProject")}”`,
      ].filter(Boolean);
      return {
        title: "Lead created",
        detail:
          [
            from,
            str(meta, "message"),
            unmatched.length > 0 ? `Unmatched ${unmatched.join(", ")}` : null,
          ]
            .filter(Boolean)
            .join(" · ") || null,
        tone: "accent",
        kind: "created",
      };
    }
    case "LEAD_RESUBMITTED":
      return {
        title: "Came back with a new inquiry",
        detail:
          [str(meta, "apiKeyName"), str(meta, "message")]
            .filter(Boolean)
            .join(" · ") || null,
        tone: "accent",
        kind: "created",
      };
    case "SLA_BREACHED":
      return {
        title: "First call missed the response time",
        detail: str(meta, "assigneeName") ? `Assigned to ${str(meta, "assigneeName")}` : null,
        tone: "negative",
        kind: "other",
      };
    case "ASSIGNED":
      return {
        title: `Assigned to ${str(meta, "assignedUserName") ?? "an agent"}`,
        detail: null,
        tone: "default",
        kind: "assignment",
      };
    case "REASSIGNED":
      return {
        title: `Reassigned to ${str(meta, "toUserName") ?? "an agent"}`,
        detail: str(meta, "fromUserName") ? `From ${str(meta, "fromUserName")}` : null,
        tone: "default",
        kind: "assignment",
      };
    case "UNASSIGNED":
      return { title: "Unassigned", detail: null, tone: "muted", kind: "assignment" };
    case "STAGE_CHANGED": {
      const closeType = str(meta, "closeType");
      const reason = str(meta, "lostReasonName");
      return {
        title: `Moved to ${str(meta, "toStageName") ?? "a new stage"}`,
        detail:
          closeType === "LOST" && reason
            ? `${reason}${str(meta, "lostNote") ? ` — ${str(meta, "lostNote")}` : ""}`
            : str(meta, "reason") === "DEAL_CANCELLED"
              ? "Re-opened after the deal was cancelled"
              : str(meta, "fromStageName")
              ? `From ${str(meta, "fromStageName")}`
              : null,
        tone: closeType === "WON" ? "positive" : closeType === "LOST" ? "negative" : "default",
        kind: "stage",
      };
    }
    case "DEAL_RESERVED":
      return {
        title: `Deal reserved${dealPrice(meta) ? ` — ${dealPrice(meta)}` : ""}`,
        detail:
          [
            str(meta, "unitType"),
            str(meta, "unitCode"),
            str(meta, "projectName"),
            str(meta, "agentName") ? `Credited to ${str(meta, "agentName")}` : null,
          ]
            .filter(Boolean)
            .join(" · ") || null,
        tone: "positive",
        kind: "deal",
      };
    case "DEAL_CONTRACTED":
      return {
        title: "Contract signed",
        detail: dealPrice(meta),
        tone: "positive",
        kind: "deal",
      };
    case "DEAL_CANCELLED":
      return {
        title: `Deal cancelled${dealPrice(meta) ? ` — ${dealPrice(meta)}` : ""}`,
        detail: str(meta, "reason"),
        tone: "negative",
        kind: "deal",
      };
    case "DEAL_UPDATED": {
      const fields = Array.isArray(meta.changedFields)
        ? (meta.changedFields as unknown[])
            .filter((field): field is string => typeof field === "string")
            .map((field) => DEAL_FIELD_LABELS[field] ?? field)
        : [];
      return {
        title: "Deal updated",
        detail: fields.length > 0 ? `Changed ${fields.join(", ")}` : null,
        tone: "muted",
        kind: "deal",
      };
    }
    case "NOTE_ADDED":
      return { title: "Note added", detail: null, tone: "muted", kind: "note" };
    case "PROJECT_LINKED":
      return { title: "Project interest added", detail: null, tone: "muted", kind: "project" };
    case "PROJECT_UNLINKED":
      return { title: "Project interest removed", detail: null, tone: "muted", kind: "project" };
    case "INTERACTION_LOGGED": {
      const channel = str(meta, "channel") as InteractionChannel | null;
      const outcome = str(meta, "outcome") as InteractionOutcome | null;
      const next = meta.nextTask as { title?: string; dueAt?: string } | null | undefined;
      const evidence = Array.isArray(meta.evidence)
        ? (meta.evidence as Array<{ name?: string }>)
        : [];
      const parts = [
        str(meta, "note"),
        evidence.length
          ? `Attached ${evidence.length === 1 ? (evidence[0].name ?? "1 file") : `${evidence.length} files`}`
          : null,
        next?.dueAt ? `Next: ${next.title ?? "follow up"} · ${formatDue(next.dueAt)}` : null,
      ].filter(Boolean);
      return {
        title: `${channel ? CHANNEL_LABELS[channel] : "Contact"} — ${
          outcome ? OUTCOME_LABELS[outcome] : "logged"
        }`,
        detail: parts.length ? parts.join(" · ") : null,
        tone:
          outcome === "NOT_INTERESTED" || outcome === "WRONG_NUMBER"
            ? "negative"
            : outcome === "NO_ANSWER" || outcome === "BUSY" || outcome === "SWITCHED_OFF"
              ? "muted"
              : "positive",
        kind: "interaction",
        channel: channel ?? undefined,
      };
    }
    case "CALL_LOGGED":
    case "WHATSAPP_LOGGED":
    case "EMAIL_LOGGED": {
      const channel: InteractionChannel =
        activity.eventType === "CALL_LOGGED"
          ? "CALL"
          : activity.eventType === "WHATSAPP_LOGGED"
            ? "WHATSAPP"
            : "EMAIL";
      return {
        title: `${CHANNEL_LABELS[channel]} logged`,
        detail: null,
        tone: "default",
        kind: "interaction",
        channel,
      };
    }
    case "TASK_CREATED":
    case "TASK_RESCHEDULED":
    case "TASK_COMPLETED":
    case "TASK_SKIPPED":
    case "TASK_CANCELLED": {
      const type = str(meta, "taskType") as TaskType | null;
      const title = str(meta, "title") ?? (type ? TASK_TYPE_LABELS[type] : "Task");
      const dueAt = str(meta, "dueAt");
      const verb = {
        TASK_CREATED: "Scheduled",
        TASK_RESCHEDULED: "Moved",
        TASK_COMPLETED: "Done",
        TASK_SKIPPED: "Skipped",
        TASK_CANCELLED: "Cancelled",
      }[activity.eventType];
      const detail =
        activity.eventType === "TASK_SKIPPED" || activity.eventType === "TASK_RESCHEDULED"
          ? [dueAt ? formatDue(dueAt) : null, str(meta, "reason")].filter(Boolean).join(" · ")
          : dueAt && activity.eventType === "TASK_CREATED"
            ? `${formatDue(dueAt)} · ${str(meta, "assigneeName") ?? ""}`.trim()
            : null;
      return {
        title: `${verb}: ${title}`,
        detail: detail || null,
        tone:
          activity.eventType === "TASK_COMPLETED"
            ? "positive"
            : activity.eventType === "TASK_SKIPPED"
              ? "negative"
              : "muted",
        kind: "task",
      };
    }
    case "CONTACT_ACCESSED": {
      const field = str(meta, "field") as ContactField | null;
      const action = str(meta, "action") as ContactAccessAction | null;
      return {
        title: `${action ? CONTACT_ACCESS_LABELS[action] : "Viewed"} ${
          field ? CONTACT_FIELD_LABELS[field] : "contact details"
        }`,
        detail: null,
        tone: "muted",
        kind: "contact",
      };
    }
    case "STATUS_ARCHIVED":
      return { title: "Archived", detail: null, tone: "muted", kind: "status" };
    case "STATUS_RESTORED":
      return { title: "Restored", detail: null, tone: "default", kind: "status" };
    case "FILE_ATTACHED":
      return { title: "File attached", detail: null, tone: "muted", kind: "file" };
    case "FILE_DELETED":
      return { title: "File removed", detail: null, tone: "muted", kind: "file" };
    case "LEAD_MERGED": {
      const moved = (meta.moved ?? {}) as Partial<Record<string, number>>;
      const counts = formatMergeCounts({
        interactions: moved.interactions,
        tasks: moved.tasks,
        notes: moved.notes,
        files: moved.files,
      });
      return {
        title: `Merged with ${str(meta, "sourceLeadName") ?? "a duplicate lead"}`,
        detail: counts ? `Moved ${counts}` : null,
        tone: "accent",
        kind: "merge",
      };
    }
    case "LEAD_UPDATED":
      return { title: "Details updated", detail: null, tone: "muted", kind: "other" };
    default:
      return { title: "Activity", detail: null, tone: "muted", kind: "other" };
  }
}
