export type CustomFieldType =
  | "TEXT"
  | "NUMBER"
  | "DATE"
  | "SELECT"
  | "MULTI_SELECT"
  | "BOOLEAN"
  | "URL";

export interface CustomFieldDefinition {
  id: string;
  /** Stable key in a lead's `customFields`; never changes. */
  key: string;
  label: string;
  description: string | null;
  type: CustomFieldType;
  /** Choices for SELECT / MULTI_SELECT; null for other types. */
  options: string[] | null;
  isRequired: boolean;
  sortOrder: number;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Values as stored on a lead (keys of archived fields included). */
export type CustomFieldValues = Record<string, unknown>;

export interface CreateCustomFieldInput {
  label: string;
  type: CustomFieldType;
  description?: string | null;
  options?: string[];
  isRequired?: boolean;
}

export interface UpdateCustomFieldInput {
  label?: string;
  description?: string | null;
  options?: string[];
  isRequired?: boolean;
}

export const CUSTOM_FIELD_TYPES: CustomFieldType[] = [
  "TEXT",
  "NUMBER",
  "DATE",
  "SELECT",
  "MULTI_SELECT",
  "BOOLEAN",
  "URL",
];

export const CUSTOM_FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  TEXT: "Text",
  NUMBER: "Number",
  DATE: "Date",
  SELECT: "Single choice",
  MULTI_SELECT: "Multiple choice",
  BOOLEAN: "Yes / no",
  URL: "Link",
};

/** Mirrors the API limits (custom-fields.constants.ts). */
export const CUSTOM_FIELD_LIMITS = {
  maxActive: 50,
  label: 60,
  description: 200,
  options: 100,
  option: 80,
  text: 1000,
} as const;

export function isOptionFieldType(type: CustomFieldType): boolean {
  return type === "SELECT" || type === "MULTI_SELECT";
}
