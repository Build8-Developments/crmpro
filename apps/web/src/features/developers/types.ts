import type { ListQueryParams, PaginatedResponse } from "@/types/pagination";

export interface Developer {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  projectCount: number;
  interestedLeadCount: number;
}

export interface CreateDeveloperInput {
  name: string;
}

export interface UpdateDeveloperInput {
  name: string;
}

export type DevelopersListParams = ListQueryParams & {
  sortBy?: "name" | "createdAt" | "updatedAt";
};

export type DevelopersListResponse = PaginatedResponse<Developer>;

export type DevelopersSortField = "name" | "createdAt" | "updatedAt";
