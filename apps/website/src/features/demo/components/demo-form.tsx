"use client";

import { useActionState, useEffect, useRef } from "react";
import { IconArrowRight, IconCircleCheck, IconLoader2 } from "@tabler/icons-react";
import { CONTACT_EMAIL } from "@/config/site";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { cn } from "@/lib/utils";
import { requestDemo } from "../actions";
import { DEMO_FIELDS, UTM_FIELDS, type DemoFieldError, type DemoFormState } from "../types";

type Copy = Dictionary["demo"]["form"];

const INITIAL: DemoFormState = { status: "idle" };

/**
 * Four fields, one button. Built for conversion and access: visible labels,
 * autocomplete and the right keyboards, errors tied to their fields and
 * announced, focus moved to the first problem, and it works without JavaScript.
 */
export function DemoForm({ copy, locale }: { copy: Copy; locale: Locale }) {
  const [state, formAction, pending] = useActionState(requestDemo, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);
  const successRef = useRef<HTMLHeadingElement>(null);

  // Fill the hidden fields once on the client: a request id (safe retries) and the ad's UTM tags.
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const set = (name: string, value: string) => {
      const input = form.elements.namedItem(name);
      if (input instanceof HTMLInputElement && !input.value) input.value = value;
    };
    set(DEMO_FIELDS.requestId, crypto.randomUUID());
    const params = new URLSearchParams(window.location.search);
    for (const field of UTM_FIELDS) set(field, params.get(field.replace("utm", "utm_").toLowerCase()) ?? "");
  }, [state.status]);

  useEffect(() => {
    if (state.status === "success") successRef.current?.focus();
    if (state.status === "error" && state.fieldErrors.length > 0) {
      formRef.current?.querySelector<HTMLElement>(`[name="${state.fieldErrors[0]}"]`)?.focus();
    }
  }, [state]);

  if (state.status === "success") {
    return (
      <div role="status" className="flex flex-col items-start gap-4 py-6">
        <IconCircleCheck className="size-10 text-primary" stroke={1.5} />
        <h3 ref={successRef} tabIndex={-1} className="font-display text-2xl font-semibold outline-none">
          {copy.success.title}
        </h3>
        <p className="text-muted-foreground">{copy.success.text}</p>
      </div>
    );
  }

  const errors = state.status === "error" ? state.fieldErrors : [];
  const values = state.status === "error" ? state.values : undefined;
  const failed = state.status === "error" && state.failed;
  const hasError = (field: DemoFieldError) => errors.includes(field);

  return (
    <form ref={formRef} action={formAction} noValidate className="grid gap-5">
      <div aria-live="assertive" className="empty:hidden">
        {errors.length > 0 ? (
          <p className="rounded-lg bg-[#fff5f3] px-4 py-3 text-sm font-semibold text-[#b4312b] dark:bg-[#471713] dark:text-[#feb2a8]">
            {copy.errors.summary}
          </p>
        ) : null}
        {failed ? (
          <p className="rounded-lg bg-[#fff5f3] px-4 py-3 text-sm text-[#b4312b] dark:bg-[#471713] dark:text-[#feb2a8]">
            {copy.errors.failed}{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold underline" dir="ltr">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        ) : null}
      </div>

      <Field id="demo-name" label={copy.name} error={hasError("name") ? copy.errors.name : undefined}>
        {(props) => (
          <input {...props} name={DEMO_FIELDS.name} type="text" autoComplete="name" required defaultValue={values?.name} />
        )}
      </Field>

      <Field
        id="demo-phone"
        label={copy.phone}
        hint={copy.phoneHint}
        error={hasError("phone") ? copy.errors.phone : undefined}
      >
        {(props) => (
          <input
            {...props}
            name={DEMO_FIELDS.phone}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            dir="ltr"
            placeholder="01X XXXX XXXX"
            required
            defaultValue={values?.phone}
            className={cn(props.className, "text-start [html[dir=rtl]_&]:text-end")}
          />
        )}
      </Field>

      <Field id="demo-company" label={copy.company} error={hasError("company") ? copy.errors.company : undefined}>
        {(props) => (
          <input
            {...props}
            name={DEMO_FIELDS.company}
            type="text"
            autoComplete="organization"
            required
            defaultValue={values?.company}
          />
        )}
      </Field>

      {/* Four choices in a row: faster than a dropdown, and native radios underneath. */}
      <fieldset className="grid gap-2">
        <legend className="mb-1.5 text-[15px] font-semibold">
          {copy.teamSize}
          <span className="ms-1.5 font-normal text-subtle-foreground">({copy.optional})</span>
        </legend>
        <div className="grid grid-cols-4 gap-2">
          {copy.teamSizes.map((size) => (
            <label key={size.value} className="cursor-pointer">
              <input
                type="radio"
                name={DEMO_FIELDS.teamSize}
                value={size.value}
                defaultChecked={values?.teamSize === size.value}
                className="peer sr-only"
              />
              <span
                dir="ltr"
                className="flex h-12 items-center justify-center rounded-lg border border-border bg-background font-display text-[15px] font-semibold tabular-nums text-muted-foreground transition-colors peer-checked:border-primary peer-checked:bg-primary-soft peer-checked:text-primary peer-focus-visible:ring-3 peer-focus-visible:ring-primary/30 hover:border-subtle-foreground hover:text-foreground"
              >
                {size.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <input type="hidden" name={DEMO_FIELDS.locale} value={locale} />
      <input type="hidden" name={DEMO_FIELDS.requestId} />
      {UTM_FIELDS.map((field) => (
        <input key={field} type="hidden" name={field} />
      ))}
      {/* Honeypot: off-screen and skipped by keyboard and screen readers. */}
      <div aria-hidden="true" className="absolute -start-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="demo-website">Website</label>
        <input id="demo-website" name={DEMO_FIELDS.trap} type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <button
        type="submit"
        disabled={pending}
        aria-disabled={pending}
        className="mt-1 inline-flex h-13 w-full items-center justify-center gap-2.5 rounded-lg bg-primary px-6 font-display text-base font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-80"
      >
        {pending ? (
          <>
            <IconLoader2 className="size-4 animate-spin" />
            {copy.sending}
          </>
        ) : (
          <>
            {copy.submit}
            <IconArrowRight className="flip-rtl size-4" />
          </>
        )}
      </button>
      <p className="text-[13px] text-subtle-foreground">{copy.privacy}</p>
    </form>
  );
}

type ControlProps = {
  id: string;
  className: string;
  "aria-invalid"?: true;
  "aria-describedby"?: string;
};

function Field({
  id,
  label,
  hint,
  optional,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  optional?: string;
  error?: string;
  children: (props: ControlProps) => React.ReactNode;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-[15px] font-semibold">
        {label}
        {optional ? <span className="ms-1.5 font-normal text-subtle-foreground">({optional})</span> : null}
      </label>
      {children({
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
        className: cn(
          "h-12 w-full rounded-lg border bg-background px-3.5 text-base text-foreground transition-colors outline-none placeholder:text-subtle-foreground focus:border-primary focus:ring-3 focus:ring-primary/20",
          error ? "border-[#b4312b] dark:border-[#fe8477]" : "border-border",
        ),
      })}
      {error ? (
        <p id={errorId} className="text-sm font-semibold text-[#b4312b] dark:text-[#fe8477]">
          {error}
        </p>
      ) : null}
      {hint ? (
        <p id={hintId} className="text-[13px] text-subtle-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
