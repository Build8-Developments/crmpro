"use client";

import type { CustomFieldValues } from "../types";
import { useCustomFields } from "../hooks";
import { formatCustomFieldValue } from "../utils/custom-field-values";
import { cn } from "@/lib/utils";

/**
 * Lead drawer: the lead's custom field values. Empty fields are hidden;
 * archived fields still show their value, greyed and marked.
 */
export function LeadCustomFieldsSummary({ values }: { values: CustomFieldValues }) {
  const { data: fields } = useCustomFields({ includeArchived: true });

  const rows = (fields ?? [])
    .map((field) => ({ field, text: formatCustomFieldValue(field, values[field.key]) }))
    .filter((row): row is { field: (typeof row)["field"]; text: string } => row.text !== null);

  if (rows.length === 0) return null;

  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        More details
      </h3>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 rounded-lg border bg-card p-3 text-sm">
        {rows.map(({ field, text }) => {
          const archived = Boolean(field.archivedAt);
          return (
            <div
              key={field.id}
              className={cn("min-w-0", archived && "opacity-60")}
              title={archived ? "This field was archived; the value is kept" : undefined}
            >
              <dt className="truncate text-[11px] text-muted-foreground">
                {field.label}
                {archived ? " · archived field" : ""}
              </dt>
              <dd className="truncate">
                {field.type === "URL" && /^https?:\/\//i.test(text) ? (
                  <a
                    href={text}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {text}
                  </a>
                ) : (
                  text
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
