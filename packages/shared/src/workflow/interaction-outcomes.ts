/**
 * Interaction outcomes and what each one implies for the next step and the
 * lead's heat. Shared by the API (validation, defaults, heat) and the web log
 * dialog (which outcomes to show, suggested next step).
 * See docs/product/workflow-engine-spec.md §2.1, §3.2, §3.3.
 */
import { atLocalTime } from './time-zone.util';

export const INTERACTION_CHANNELS = [
  'CALL',
  'WHATSAPP',
  'MEETING',
  'SITE_VISIT',
  'VIDEO_CALL',
  'EMAIL',
  'SMS',
] as const;
export type InteractionChannel = (typeof INTERACTION_CHANNELS)[number];

export const INTERACTION_OUTCOMES = [
  'NO_ANSWER',
  'BUSY',
  'SWITCHED_OFF',
  'WRONG_NUMBER',
  'ANSWERED_INTERESTED',
  'ANSWERED_NOT_NOW',
  'CALLBACK_REQUESTED',
  'NOT_INTERESTED',
  'MEETING_BOOKED',
  'VISIT_BOOKED',
  'VISIT_DONE',
  'OFFER_SENT',
  'NEGOTIATING',
  'RESERVED',
] as const;
export type InteractionOutcome = (typeof INTERACTION_OUTCOMES)[number];

export const TASK_TYPES = [
  'CALL',
  'WHATSAPP',
  'MEETING',
  'SITE_VISIT',
  'SEND_OFFER',
  'PAPERWORK',
  'REVIEW',
  'OTHER',
] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export const TASK_PRIORITIES = ['URGENT', 'HIGH', 'NORMAL', 'LOW'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const LEAD_HEATS = ['HOT', 'WARM', 'COLD'] as const;
export type LeadHeat = (typeof LEAD_HEATS)[number];

export const CHANNEL_LABELS: Record<InteractionChannel, string> = {
  CALL: 'Call',
  WHATSAPP: 'WhatsApp',
  MEETING: 'Office meeting',
  SITE_VISIT: 'Site visit',
  VIDEO_CALL: 'Video call',
  EMAIL: 'Email',
  SMS: 'SMS',
};

export const OUTCOME_LABELS: Record<InteractionOutcome, string> = {
  NO_ANSWER: 'No answer',
  BUSY: 'Busy',
  SWITCHED_OFF: 'Switched off',
  WRONG_NUMBER: 'Wrong number',
  ANSWERED_INTERESTED: 'Interested',
  ANSWERED_NOT_NOW: 'Not now',
  CALLBACK_REQUESTED: 'Call me back',
  NOT_INTERESTED: 'Not interested',
  MEETING_BOOKED: 'Meeting booked',
  VISIT_BOOKED: 'Visit booked',
  VISIT_DONE: 'Visit done',
  OFFER_SENT: 'Offer sent',
  NEGOTIATING: 'Negotiating',
  RESERVED: 'Reserved a unit',
};

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  CALL: 'Call',
  WHATSAPP: 'WhatsApp',
  MEETING: 'Meeting',
  SITE_VISIT: 'Site visit',
  SEND_OFFER: 'Send offer',
  PAPERWORK: 'Paperwork',
  REVIEW: 'Review',
  OTHER: 'Other',
};

/** Which outcomes make sense for each channel, in display order. */
export const OUTCOMES_BY_CHANNEL: Record<InteractionChannel, readonly InteractionOutcome[]> = {
  CALL: [
    'NO_ANSWER',
    'BUSY',
    'SWITCHED_OFF',
    'ANSWERED_INTERESTED',
    'CALLBACK_REQUESTED',
    'ANSWERED_NOT_NOW',
    'MEETING_BOOKED',
    'VISIT_BOOKED',
    'OFFER_SENT',
    'NEGOTIATING',
    'RESERVED',
    'NOT_INTERESTED',
    'WRONG_NUMBER',
  ],
  WHATSAPP: [
    'NO_ANSWER',
    'ANSWERED_INTERESTED',
    'CALLBACK_REQUESTED',
    'ANSWERED_NOT_NOW',
    'MEETING_BOOKED',
    'VISIT_BOOKED',
    'OFFER_SENT',
    'NEGOTIATING',
    'NOT_INTERESTED',
    'WRONG_NUMBER',
  ],
  MEETING: [
    'ANSWERED_INTERESTED',
    'VISIT_BOOKED',
    'OFFER_SENT',
    'NEGOTIATING',
    'RESERVED',
    'ANSWERED_NOT_NOW',
    'NOT_INTERESTED',
    'NO_ANSWER',
  ],
  SITE_VISIT: ['VISIT_DONE', 'OFFER_SENT', 'NEGOTIATING', 'RESERVED', 'NOT_INTERESTED', 'NO_ANSWER'],
  VIDEO_CALL: [
    'ANSWERED_INTERESTED',
    'VISIT_BOOKED',
    'OFFER_SENT',
    'NEGOTIATING',
    'ANSWERED_NOT_NOW',
    'NOT_INTERESTED',
    'NO_ANSWER',
  ],
  EMAIL: ['NO_ANSWER', 'ANSWERED_INTERESTED', 'ANSWERED_NOT_NOW', 'OFFER_SENT', 'NOT_INTERESTED'],
  SMS: ['NO_ANSWER', 'ANSWERED_INTERESTED', 'ANSWERED_NOT_NOW', 'NOT_INTERESTED'],
};

/** The client was not reached — drives the no-answer cadence. */
export const UNANSWERED_OUTCOMES: readonly InteractionOutcome[] = [
  'NO_ANSWER',
  'BUSY',
  'SWITCHED_OFF',
];

/** No next step needed: the lead should be closed as Lost instead. */
export const CLOSING_OUTCOMES: readonly InteractionOutcome[] = [
  'NOT_INTERESTED',
  'WRONG_NUMBER',
];

const HOT_OUTCOMES: readonly InteractionOutcome[] = [
  'MEETING_BOOKED',
  'VISIT_BOOKED',
  'VISIT_DONE',
  'OFFER_SENT',
  'NEGOTIATING',
  'RESERVED',
];

const WARM_OUTCOMES: readonly InteractionOutcome[] = [
  'ANSWERED_INTERESTED',
  'CALLBACK_REQUESTED',
  'ANSWERED_NOT_NOW',
];

/** When the next step should be, relative to the interaction. */
export type NextStepOffset =
  | { kind: 'hours'; hours: number }
  | { kind: 'dayAt'; days: number; hour: number; minute?: number };

export interface NextStepSuggestion {
  type: TaskType;
  title: string;
  offset: NextStepOffset;
  /** The agent should pick the exact time (callback, meeting, visit). */
  askForTime: boolean;
}

/** Default next step per outcome (spec §3.2 rules R2–R6, R10). */
export const NEXT_STEP_DEFAULTS: Partial<Record<InteractionOutcome, NextStepSuggestion>> = {
  NO_ANSWER: { type: 'CALL', title: 'Retry call', offset: { kind: 'hours', hours: 2 }, askForTime: false },
  BUSY: { type: 'CALL', title: 'Retry call', offset: { kind: 'hours', hours: 1 }, askForTime: false },
  SWITCHED_OFF: {
    type: 'WHATSAPP',
    title: 'Send WhatsApp and retry',
    offset: { kind: 'hours', hours: 3 },
    askForTime: false,
  },
  ANSWERED_INTERESTED: {
    type: 'CALL',
    title: 'Follow up',
    offset: { kind: 'dayAt', days: 2, hour: 12 },
    askForTime: false,
  },
  ANSWERED_NOT_NOW: {
    type: 'CALL',
    title: 'Check back',
    offset: { kind: 'dayAt', days: 7, hour: 12 },
    askForTime: false,
  },
  CALLBACK_REQUESTED: {
    type: 'CALL',
    title: 'Call back as requested',
    offset: { kind: 'dayAt', days: 1, hour: 12 },
    askForTime: true,
  },
  MEETING_BOOKED: {
    type: 'MEETING',
    title: 'Office meeting',
    offset: { kind: 'dayAt', days: 2, hour: 13 },
    askForTime: true,
  },
  VISIT_BOOKED: {
    type: 'SITE_VISIT',
    title: 'Site visit',
    offset: { kind: 'dayAt', days: 2, hour: 12 },
    askForTime: true,
  },
  VISIT_DONE: {
    type: 'CALL',
    title: 'Post-visit follow-up',
    offset: { kind: 'dayAt', days: 1, hour: 12 },
    askForTime: false,
  },
  OFFER_SENT: {
    type: 'CALL',
    title: 'Follow up on the offer',
    offset: { kind: 'dayAt', days: 2, hour: 12 },
    askForTime: false,
  },
  NEGOTIATING: {
    type: 'CALL',
    title: 'Continue negotiation',
    offset: { kind: 'dayAt', days: 1, hour: 12 },
    askForTime: false,
  },
  RESERVED: {
    type: 'PAPERWORK',
    title: 'Collect documents and set contract date',
    offset: { kind: 'dayAt', days: 1, hour: 11 },
    askForTime: false,
  },
};

export function isUnansweredOutcome(outcome: InteractionOutcome): boolean {
  return UNANSWERED_OUTCOMES.includes(outcome);
}

export function requiresNextStep(outcome: InteractionOutcome): boolean {
  return !CLOSING_OUTCOMES.includes(outcome);
}

export function resolveNextStepDueAt(
  offset: NextStepOffset,
  from: Date,
  timeZone: string,
): Date {
  if (offset.kind === 'hours') {
    return new Date(from.getTime() + offset.hours * 60 * 60 * 1000);
  }
  return atLocalTime(from, offset.days, offset.hour, offset.minute ?? 0, timeZone);
}

export interface HeatInput {
  lastOutcome: InteractionOutcome | null;
  lastOutcomeAt: Date | null;
  hasHotInterest: boolean;
  unansweredStreak: number;
  now?: Date;
}

/**
 * Heat rules (spec §3.3): visible and explainable, not a score.
 * - COLD after 3 unanswered attempts in a row.
 * - HOT: hot outcome in the last 14 days, or a HOT project interest.
 * - WARM: interested / callback / not-now in the last 21 days, or never
 *   contacted yet (new leads start warm).
 * - COLD otherwise.
 */
export function computeLeadHeat(input: HeatInput): LeadHeat {
  const now = input.now ?? new Date();
  if (input.unansweredStreak >= 3) return 'COLD';
  const ageDays =
    input.lastOutcomeAt === null
      ? null
      : (now.getTime() - input.lastOutcomeAt.getTime()) / (24 * 60 * 60 * 1000);
  if (input.hasHotInterest) return 'HOT';
  if (input.lastOutcome && ageDays !== null) {
    if (HOT_OUTCOMES.includes(input.lastOutcome) && ageDays <= 14) return 'HOT';
    if (WARM_OUTCOMES.includes(input.lastOutcome) && ageDays <= 21) return 'WARM';
    if (UNANSWERED_OUTCOMES.includes(input.lastOutcome) && ageDays <= 21) return 'WARM';
    return 'COLD';
  }
  return 'WARM';
}
