export interface TeamMember {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  role: { id: string; name: string };
}

export interface Team {
  id: string;
  name: string;
  leader: { id: string; name: string } | null;
  memberCount: number;
  members: TeamMember[];
  createdAt: string;
  updatedAt: string;
}

export interface TeamInput {
  name: string;
  leaderUserId: string | null;
}
