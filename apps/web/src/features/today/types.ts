import type { LeadTask } from "@/features/leads/types";

export interface TodayTask extends LeadTask {
  escalateAt: string | null;
  context: {
    unansweredStreak: number;
    lastContactedAt: string | null;
    lastOutcome: string | null;
    projectName: string | null;
  } | null;
}

export interface SuggestedLead {
  id: string;
  fullName: string;
  heat: "HOT" | "WARM" | "COLD";
  stage: { id: string; name: string; color: string | null; icon: string | null };
  lastContactedAt: string | null;
  reason: string;
}

export interface TodayData {
  user: { id: string; name: string };
  timeZone: string;
  date: string;
  workday: { isWorkingDay: boolean; startsAt: string | null; endsAt: string | null };
  progress: { done: number; planned: number; percent: number };
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
  month: { interactions: number; visits: number; won: number; newLeads: number };
  allTime: { won: number; interactions: number; visits: number; clients: number; since: string };
}
