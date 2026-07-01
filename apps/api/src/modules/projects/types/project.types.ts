export interface ProjectDeveloperSummary {
  id: string;
  name: string;
}

export interface ProjectResponse {
  id: string;
  name: string;
  location: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  interestedLeadCount: number;
  developer: ProjectDeveloperSummary;
}
