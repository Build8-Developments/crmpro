import { ApiError } from "@/lib/api/client";
import {
  CUSTOM_FIELD_LIMITS,
  type CustomFieldDefinition,
  type CustomFieldValues,
} from "../types";

/** What a form holds per field while editing. */
export type CustomFieldDraftValue = string | boolean | string[] | null;
export type CustomFieldDraft = Record<string, CustomFieldDraftValue>;

/** Field key → message. */
export type CustomFieldErrors = Record<string, string>;

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function isBlank(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim() === "") ||
    (Array.isArray(value) && value.length === 0)
  );
}

/** Stored lead values → form draft (numbers become editable text). */
export function draftFromValues(
  values: CustomFieldValues | null | undefined,
): CustomFieldDraft {
  const draft: CustomFieldDraft = {};
  for (const [key, value] of Object.entries(values ?? {})) {
    if (typeof value === "boolean" || typeof value === "string") {
      draft[key] = value;
    } else if (typeof value === "number") {
      draft[key] = String(value);
    } else if (Array.isArray(value)) {
      draft[key] = value.filter((item): item is string => typeof item === "string");
    }
  }
  return draft;
}

/** Draft value → what the API receives (null clears the value). */
function toApiValue(field: CustomFieldDefinition, value: CustomFieldDraftValue | undefined) {
  if (value === undefined || isBlank(value)) return null;
  if (typeof value === "string") {
    const text = value.trim();
    if (field.type === "NUMBER") {
      const number = Number(text.replace(/,/g, ""));
      // An unreadable number is sent as typed so the API explains it.
      return Number.isFinite(number) ? number : text;
    }
    return text;
  }
  return value;
}

function sameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

/**
 * The `customFields` payload for a lead create / update. With `stored`
 * (edit), only the fields whose value changed are sent; the API merges them
 * into what the lead already has. Undefined when there is nothing to send.
 */
export function customFieldsInput(
  fields: CustomFieldDefinition[],
  draft: CustomFieldDraft,
  stored?: CustomFieldValues,
): Record<string, unknown> | undefined {
  const input: Record<string, unknown> = {};
  for (const field of fields) {
    const value = toApiValue(field, draft[field.key]);
    if (stored && sameValue(stored[field.key], value)) continue;
    if (!stored && value === null) continue;
    input[field.key] = value;
  }
  return Object.keys(input).length > 0 ? input : undefined;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && url.hostname.length > 0;
  } catch {
    return false;
  }
}

/**
 * Client-side checks matching the API rules, so people see the problem next
 * to the input. `checkRequired`: a new lead always; an edit only when it
 * changes a custom field (the API applies the same rule).
 */
export function validateCustomFieldDraft(
  fields: CustomFieldDefinition[],
  draft: CustomFieldDraft,
  options: { checkRequired: boolean },
): CustomFieldErrors {
  const errors: CustomFieldErrors = {};
  for (const field of fields) {
    const value = draft[field.key];
    if (value === undefined || isBlank(value)) {
      if (field.isRequired && options.checkRequired) errors[field.key] = "Required";
      continue;
    }
    if (typeof value !== "string") continue;
    const text = value.trim();
    switch (field.type) {
      case "NUMBER":
        if (!/^-?\d+(\.\d+)?$/.test(text.replace(/,/g, ""))) {
          errors[field.key] = "Enter a number";
        }
        break;
      case "URL":
        if (!isHttpUrl(text)) errors[field.key] = "Enter a link starting with https://";
        break;
      case "DATE":
        if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) errors[field.key] = "Pick a date";
        break;
      case "TEXT":
        if (text.length > CUSTOM_FIELD_LIMITS.text) {
          errors[field.key] = `At most ${CUSTOM_FIELD_LIMITS.text} characters`;
        }
        break;
      default:
        break;
    }
  }
  return errors;
}

/** Per-field messages from a 400 on lead create / update, if any. */
export function customFieldErrorsFromApi(error: unknown): CustomFieldErrors | null {
  if (!(error instanceof ApiError)) return null;
  const details = error.details as { customFields?: unknown } | null;
  const fields = details?.customFields;
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) return null;
  const errors: CustomFieldErrors = {};
  for (const [key, message] of Object.entries(fields)) {
    if (typeof message === "string") errors[key] = message;
  }
  return Object.keys(errors).length > 0 ? errors : null;
}

/** A stored value as display text (null when there is nothing to show). */
export function formatCustomFieldValue(
  field: Pick<CustomFieldDefinition, "type">,
  value: unknown,
): string | null {
  if (isBlank(value)) return null;
  switch (field.type) {
    case "BOOLEAN":
      return value === true ? "Yes" : value === false ? "No" : null;
    case "MULTI_SELECT":
      return Array.isArray(value) ? value.join(", ") : String(value);
    case "NUMBER":
      return typeof value === "number"
        ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value)
        : String(value);
    case "DATE": {
      const match = typeof value === "string" ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null;
      if (!match) return String(value);
      return `${Number(match[3])} ${MONTHS[Number(match[2]) - 1] ?? match[2]} ${match[1]}`;
    }
    default:
      return typeof value === "string" ? value : JSON.stringify(value);
  }
}
