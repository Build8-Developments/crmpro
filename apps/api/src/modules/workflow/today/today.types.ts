import type { LeadHeat } from '@crmpro/database';
import type { TaskResponse } from '../common/workflow.mappers';

export interface TodayTask extends TaskResponse {
  /** What the agent needs to act without opening the lead. */
  context: {
    unansweredStreak: number;
    lastContactedAt: Date | null;
    lastOutcome: string | null;
    projectName: string | null;
  } | null;
}

export interface SuggestedLead {
  id: string;
  fullName: string;
  heat: LeadHeat;
  stage: {
    id: string;
    name: string;
    color: string | null;
    icon: string | null;
  };
  lastContactedAt: Date | null;
  reason: string;
}

export interface TodayResponse {
  user: { id: string; name: string };
  timeZone: string;
  /** Tenant-local calendar date, YYYY-MM-DD. */
  date: string;
  workday: {
    isWorkingDay: boolean;
    startsAt: Date | null;
    endsAt: Date | null;
  };
  progress: { done: number; planned: number; percent: number };
  /** Consecutive working days with ≥ 80% of the plan done. */
  streak: number;
  counters: {
    calls: number;
    whatsapp: number;
    meetings: number;
    visits: number;
    total: number;
    goal: number;
  };
  upNext: TodayTask | null;
  sections: {
    speedToLead: TodayTask[];
    overdue: TodayTask[];
    scheduled: TodayTask[];
    followUps: TodayTask[];
  };
  suggested: SuggestedLead[];
  upcoming: TodayTask[];
  month: {
    interactions: number;
    visits: number;
    won: number;
    newLeads: number;
  };
  allTime: {
    won: number;
    interactions: number;
    visits: number;
    clients: number;
    since: Date;
  };
}
