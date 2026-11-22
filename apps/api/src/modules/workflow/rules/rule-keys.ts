/**
 * Playbook rules (docs/product/workflow-engine-spec.md §3.2). Tasks created by
 * a rule carry its key; one OPEN task per (lead, rule) is enforced by the
 * partial unique index `Task_open_lead_rule_key`, so rules are idempotent.
 */
export const RULE_KEYS = {
  /** R1 — first call to a newly assigned lead, inside the SLA. */
  FIRST_CONTACT: 'first_contact',
  /** R5 — confirm a booked meeting / visit the day before. */
  CONFIRM_APPOINTMENT: 'confirm_appointment',
  /** R7 — an open lead has no next step. */
  PLAN_NEXT_STEP: 'plan_next_step',
  /** R8 — no contact for the stage's `staleAfterDays`: "Revive" call. */
  REVIVE_STALE: 'revive_stale',
  /** R9 — in the stage longer than `stuckAfterDays`: manager review. */
  STUCK_REVIEW: 'stuck_review',
  /** R10 — deal reserved: collect documents, set the contract date. */
  DEAL_PAPERWORK: 'deal_paperwork',
  /** R11 — 30 days after the contract: check in, ask for a referral. */
  DEAL_CHECK_IN: 'deal_check_in',
  /** R12 — lost with a recyclable reason, after its recycle delay. */
  RE_ENGAGE: 're_engage',
  /** R13 — rolling manager task while leads wait for an owner (no lead). */
  ASSIGN_NEW_LEADS: 'assign_new_leads',
} as const;

export const RULES_SWEEP_JOB = 'workflow-rules-sweep';
export const RULES_SWEEP_EVERY_MS = 5 * 60_000;

export const TASK_REMINDERS_JOB = 'task-reminders';
export const TASK_REMINDERS_EVERY_MS = 60_000;
/** "Due soon" notice this long before a task. */
export const TASK_DUE_SOON_MINUTES = 15;
/** Overdue notices are only sent for tasks that went overdue recently. */
export const TASK_OVERDUE_LOOKBACK_HOURS = 24;
export const TASK_REMINDER_BATCH_SIZE = 200;

/** Leads handled per tenant per sweep for the invariant (R7). */
export const PLAN_NEXT_STEP_BATCH = 200;
/** Working minutes an agent gets to act on a "plan the next step" task. */
export const PLAN_NEXT_STEP_WITHIN_MINUTES = 60;
/** Local time of the "confirm tomorrow's visit" message. */
export const CONFIRM_APPOINTMENT_HOUR = 11;

/** Leads/deals looked at per tenant per sweep by R8–R12. */
export const RULE_CANDIDATE_BATCH = 500;
/**
 * Time-based rules (R11, R12) only fire while their trigger date is this
 * recent, so enabling them does not flood people with years of history; the
 * window also lets capped rules catch up over the following days.
 */
export const RULE_CATCH_UP_DAYS = 14;

/** R8: at most this many revive calls per agent per local day (spec §3.4). */
export const REVIVE_DAILY_CAP = 5;
/** R9: at most this many new review tasks per manager per local day. */
export const STUCK_REVIEW_DAILY_CAP = 5;
/** R12: at most this many re-engage calls per person per local day. */
export const RE_ENGAGE_DAILY_CAP = 5;

/** R10: working days to collect the documents. */
export const PAPERWORK_DUE_WORKING_DAYS = 2;
/** R10: without a contract date, managers hear about it this long after the reservation. */
export const CONTRACT_EXPECTED_WITHIN_DAYS = 14;
/** R11: days after the contract for the check-in call. */
export const CHECK_IN_AFTER_DAYS = 30;
