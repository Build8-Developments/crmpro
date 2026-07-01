import type { ListQueryParams, PaginatedResponse } from "@/types/pagination";

export interface ProjectDeveloper {
  id: string;
  name: string;
}

export interface Project {
  id: string;
  name: string;
  location: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  interestedLeadCount: number;
  developer: ProjectDeveloper;
}

export interface CreateProjectInput {
  developerId: string;
  name: string;
  location?: string;
}

export interface UpdateProjectInput {
  developerId?: string;
  name?: string;
  location?: string | null;
  isActive?: boolean;
}

export type ProjectsListParams = ListQueryParams & {
  developerId?: string;
  isActive?: boolean;
  sortBy?: "name" | "createdAt" | "updatedAt" | "isActive";
};

export type ProjectsListResponse = PaginatedResponse<Project>;

export type ProjectsSortField = "name" | "createdAt" | "updatedAt" | "isActive";

export type ProjectStatusFilter = "all" | "active" | "inactive";
