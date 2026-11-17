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
  key: string;
  label: string;
  type: CustomFieldType;
  options: string[] | null;
  isRequired: boolean;
  sortOrder: number;
  archivedAt: string | null;
}

export type CustomFieldValues = Record<string, string | number | boolean | string[] | null>;

export const CUSTOM_FIELD_TYPES: CustomFieldType[] = [
  "TEXT",
  "NUMBER",
  "DATE",
  "SELECT",
  "MULTI_SELECT",
  "BOOLEAN",
  "URL",
];
