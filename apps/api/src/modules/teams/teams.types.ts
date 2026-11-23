export interface TeamMemberSummary {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  role: { id: string; name: string };
}

export interface TeamResponse {
  id: string;
  name: string;
  leader: { id: string; name: string } | null;
  memberCount: number;
  members: TeamMemberSummary[];
  createdAt: string;
  updatedAt: string;
}
