"use client";

import {
  IconCalendarEvent,
  IconCash,
  IconCircle,
  IconCircleCheck,
  IconCircleX,
  IconClock,
  IconFileText,
  IconFlame,
  IconHeartHandshake,
  IconHome,
  IconKey,
  IconMapPin,
  IconMessage,
  IconPhone,
  IconSparkles,
  IconStar,
  IconTrophy,
  type Icon,
} from "@tabler/icons-react";
import { STAGE_ICON_KEYS, type StageIconKey } from "@crmpro/shared";
import { cn } from "@/lib/utils";

export const STAGE_ICONS: Record<StageIconKey, Icon> = {
  sparkles: IconSparkles,
  phone: IconPhone,
  message: IconMessage,
  "circle-check": IconCircleCheck,
  calendar: IconCalendarEvent,
  "map-pin": IconMapPin,
  home: IconHome,
  "file-text": IconFileText,
  handshake: IconHeartHandshake,
  cash: IconCash,
  key: IconKey,
  clock: IconClock,
  star: IconStar,
  flame: IconFlame,
  trophy: IconTrophy,
  "circle-x": IconCircleX,
};

export const STAGE_ICON_LABELS: Record<StageIconKey, string> = {
  sparkles: "New",
  phone: "Call",
  message: "Message",
  "circle-check": "Qualified",
  calendar: "Meeting",
  "map-pin": "Visit",
  home: "Unit",
  "file-text": "Offer",
  handshake: "Deal",
  cash: "Payment",
  key: "Handover",
  clock: "Waiting",
  star: "VIP",
  flame: "Hot",
  trophy: "Won",
  "circle-x": "Lost",
};

export interface StageLike {
  name: string;
  color: string | null;
  icon?: string | null;
  closeType?: "WON" | "LOST" | null;
}

function isStageIconKey(value: string | null | undefined): value is StageIconKey {
  return Boolean(value) && (STAGE_ICON_KEYS as readonly string[]).includes(value!);
}

/** Every icon a stage can render, including the generic fallback. */
export const STAGE_ICON_GLYPHS: Record<StageIconKey | "default", Icon> = {
  ...STAGE_ICONS,
  default: IconCircle,
};

/** Which glyph a stage shows (its own icon, else one for its outcome). */
export function stageIconKey(stage: Pick<StageLike, "icon" | "closeType">): StageIconKey | "default" {
  if (isStageIconKey(stage.icon)) return stage.icon;
  if (stage.closeType === "WON") return "trophy";
  if (stage.closeType === "LOST") return "circle-x";
  return "default";
}

/** The stage color, or a neutral fallback. */
export function stageTint(color: string | null | undefined): string {
  return color || "var(--muted-foreground)";
}

/**
 * Small, quiet stage pill: tinted background, colored icon, readable text.
 * Sits next to a lead's name instead of taking a whole table column.
 */
export function StageBadge({
  stage,
  archived = false,
  size = "sm",
  className,
}: {
  stage: StageLike;
  archived?: boolean;
  size?: "xs" | "sm";
  className?: string;
}) {
  const Icon = STAGE_ICON_GLYPHS[stageIconKey(stage)];
  const tint = stageTint(stage.color);
  return (
    <span
      title={archived ? `${stage.name} · archived` : stage.name}
      className={cn(
        "inline-flex max-w-[11rem] shrink-0 items-center gap-1 rounded-full font-medium text-foreground/80",
        size === "xs" ? "h-[18px] px-1.5 text-[10px]" : "h-5 px-2 text-[11px]",
        archived && "opacity-60",
        className,
      )}
      style={{
        backgroundColor: `color-mix(in oklab, ${tint} 14%, transparent)`,
        boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${tint} 28%, transparent)`,
      }}
    >
      <Icon className={size === "xs" ? "size-3" : "size-3.5"} style={{ color: tint }} stroke={2} />
      <span className="truncate">{stage.name}</span>
    </span>
  );
}

/** Icon in a soft colored tile — stage headers on the board. */
export function StageIconTile({
  stage,
  className,
}: {
  stage: StageLike;
  className?: string;
}) {
  const Icon = STAGE_ICON_GLYPHS[stageIconKey(stage)];
  const tint = stageTint(stage.color);
  return (
    <span
      className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", className)}
      style={{ backgroundColor: `color-mix(in oklab, ${tint} 16%, transparent)`, color: tint }}
    >
      <Icon className="size-4" stroke={2} />
    </span>
  );
}

export function StageIconPicker({
  value,
  color,
  onChange,
}: {
  value: string | null;
  color: string | null;
  onChange: (icon: StageIconKey) => void;
}) {
  const tint = stageTint(color);
  return (
    <div className="grid grid-cols-8 gap-1.5" role="radiogroup" aria-label="Stage icon">
      {STAGE_ICON_KEYS.map((key) => {
        const Icon = STAGE_ICONS[key];
        const selected = value === key;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={selected}
            title={STAGE_ICON_LABELS[key]}
            onClick={() => onChange(key)}
            className={cn(
              "flex aspect-square items-center justify-center rounded-md border transition-colors duration-fast ease-enter",
              selected ? "border-transparent" : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            style={
              selected
                ? {
                    backgroundColor: `color-mix(in oklab, ${tint} 16%, transparent)`,
                    color: tint,
                    boxShadow: `inset 0 0 0 1.5px ${tint}`,
                  }
                : undefined
            }
          >
            <Icon className="size-4" stroke={2} />
          </button>
        );
      })}
    </div>
  );
}
