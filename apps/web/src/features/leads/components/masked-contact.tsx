"use client";

import { useEffect, useRef, useState } from "react";
import {
  IconBrandWhatsapp,
  IconCheck,
  IconCopy,
  IconEye,
  IconEyeOff,
  IconMail,
  IconPhone,
} from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { CONTACT_FIELD_LABELS, toAsciiDigits } from "@crmpro/shared";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { accessLeadContact } from "@/features/leads/api";
import type { ContactAccessAction, ContactField } from "@/features/leads/types";
import { queryKeys } from "@/lib/query/query-keys";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const REVEAL_SECONDS = 60;

/**
 * Fetch a contact value (logged) and act on it: copy, call, WhatsApp, email.
 * Used by menus that don't show the value itself.
 */
export async function runContactAction(
  leadId: string,
  field: ContactField,
  action: "COPY" | "CALL" | "WHATSAPP" | "EMAIL",
): Promise<void> {
  let value: string | null = null;
  try {
    value = (await accessLeadContact(leadId, field, action)).value;
  } catch {
    toast.error("Couldn't load the contact details");
    return;
  }
  if (!value) {
    toast.info(`No ${CONTACT_FIELD_LABELS[field]} on this lead`);
    return;
  }
  if (action === "COPY") {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`Copied ${CONTACT_FIELD_LABELS[field]}`);
    } catch {
      toast.error("Copy failed");
    }
    return;
  }
  const href =
    action === "CALL"
      ? `tel:${value}`
      : action === "EMAIL"
        ? `mailto:${value}`
        : `https://wa.me/${whatsappNumber(value)}`;
  window.open(href, action === "WHATSAPP" ? "_blank" : "_self", "noopener");
}

/** wa.me wants international digits only; Egyptian 01… numbers become 201…. */
function whatsappNumber(phone: string): string {
  const digits = toAsciiDigits(phone).replace(/\D/g, "");
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith("0")) return `20${digits.slice(1)}`;
  return digits;
}

/**
 * A client phone/email that stays masked until someone asks for it. Reveal
 * shows it for 60 seconds (or until clicked again); copy, call, WhatsApp and
 * email fetch it too. Every access is logged on the lead and in the audit log
 * by the API — the real value is never in the list/detail responses.
 */
export function MaskedContact({
  leadId,
  field,
  masked,
  variant = "full",
  className,
}: {
  leadId: string;
  field: ContactField;
  masked: string;
  /** "full" = value + all actions (drawer); "compact" = table cell. */
  variant?: "full" | "compact";
  className?: string;
}) {
  const queryClient = useQueryClient();
  const [revealed, setRevealed] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState<ContactAccessAction | null>(null);
  const timer = useRef<number | null>(null);

  const hide = () => {
    setRevealed(null);
    setSecondsLeft(0);
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
  };

  useEffect(() => () => {
    if (timer.current) window.clearInterval(timer.current);
  }, []);

  const fetchValue = async (action: ContactAccessAction): Promise<string | null> => {
    setPending(action);
    try {
      const { value } = await accessLeadContact(leadId, field, action);
      // The access shows up on the lead's timeline.
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.leads.detail(leadId), "activities"] });
      return value;
    } catch {
      toast.error("Couldn't load the contact details");
      return null;
    } finally {
      setPending(null);
    }
  };

  const reveal = async () => {
    if (revealed) {
      hide();
      return;
    }
    const value = await fetchValue("REVEAL");
    if (!value) return;
    setRevealed(value);
    setSecondsLeft(REVEAL_SECONDS);
    timer.current = window.setInterval(() => {
      setSecondsLeft((left) => {
        if (left <= 1) {
          hide();
          return 0;
        }
        return left - 1;
      });
    }, 1000);
  };

  const copy = async () => {
    const value = await fetchValue("COPY");
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
      toast.success(`Copied ${CONTACT_FIELD_LABELS[field]}`);
    } catch {
      toast.error("Copy failed");
    }
  };

  const open = async (action: "CALL" | "WHATSAPP" | "EMAIL") => {
    const value = await fetchValue(action);
    if (!value) return;
    const href =
      action === "CALL"
        ? `tel:${value}`
        : action === "EMAIL"
          ? `mailto:${value}`
          : `https://wa.me/${whatsappNumber(value)}`;
    window.open(href, action === "WHATSAPP" ? "_blank" : "_self", "noopener");
  };

  const isEmail = field === "email";
  const label = CONTACT_FIELD_LABELS[field];

  return (
    <span className={cn("group/contact inline-flex min-w-0 items-center gap-1", className)}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              void reveal();
            }}
            disabled={pending === "REVEAL"}
            aria-label={revealed ? `Hide ${label}` : `Show ${label}`}
            className={cn(
              "relative inline-flex min-w-0 items-center gap-1.5 rounded px-1 -mx-1 text-left tabular-nums transition-colors duration-fast ease-enter hover:bg-muted",
              revealed ? "text-foreground" : "text-muted-foreground",
              isEmail ? "" : "tracking-wide",
            )}
          >
            <span className="truncate">{revealed ?? masked}</span>
            {variant === "full" ? (
              revealed ? (
                <IconEyeOff className="size-3.5 shrink-0 opacity-60" />
              ) : (
                <IconEye className="size-3.5 shrink-0 opacity-60" />
              )
            ) : null}
            {revealed ? (
              <span
                aria-hidden
                className="absolute inset-x-1 -bottom-0.5 h-0.5 origin-left rounded-full bg-primary/50 transition-transform duration-1000 ease-linear"
                style={{ transform: `scaleX(${secondsLeft / REVEAL_SECONDS})` }}
              />
            ) : null}
          </button>
        </TooltipTrigger>
        <TooltipContent>
          {revealed ? `Hides in ${secondsLeft}s — click to hide now` : `Show ${label} (logged)`}
        </TooltipContent>
      </Tooltip>

      <span
        className={cn(
          "inline-flex shrink-0 items-center",
          variant === "compact" && "opacity-0 transition-opacity duration-fast group-hover/contact:opacity-100 focus-within:opacity-100",
        )}
      >
        <ContactActionButton label={`Copy ${label}`} onClick={copy}>
          {copied ? <IconCheck className="size-3.5 text-primary" /> : <IconCopy className="size-3.5" />}
        </ContactActionButton>
        {variant === "full" && !isEmail ? (
          <>
            <ContactActionButton label="Call" onClick={() => open("CALL")}>
              <IconPhone className="size-3.5" />
            </ContactActionButton>
            <ContactActionButton label="WhatsApp" onClick={() => open("WHATSAPP")}>
              <IconBrandWhatsapp className="size-3.5" />
            </ContactActionButton>
          </>
        ) : null}
        {variant === "full" && isEmail ? (
          <ContactActionButton label="Send email" onClick={() => open("EMAIL")}>
            <IconMail className="size-3.5" />
          </ContactActionButton>
        ) : null}
      </span>
    </span>
  );
}

function ContactActionButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void | Promise<void>;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={`${label} (logged)`}
      onClick={(event) => {
        event.stopPropagation();
        void onClick();
      }}
      className="flex size-6 items-center justify-center rounded text-muted-foreground transition-colors duration-fast ease-enter hover:bg-muted hover:text-foreground"
    >
      {children}
    </button>
  );
}
