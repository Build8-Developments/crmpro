"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLostReasons } from "@/features/leads/hooks";

interface LostReasonFieldsProps {
  reasonId: string | undefined;
  note: string;
  onReasonChange: (reasonId: string) => void;
  onNoteChange: (note: string) => void;
}

/** Shown whenever a lead is moved to a Lost stage — the reason is required. */
export function LostReasonFields({
  reasonId,
  note,
  onReasonChange,
  onNoteChange,
}: LostReasonFieldsProps) {
  const { data: reasons, isLoading } = useLostReasons();

  return (
    <div className="space-y-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3 motion-safe:animate-slide-in [--slide:-4px]">
      <div className="space-y-1.5">
        <Label>Why was it lost?</Label>
        <Select value={reasonId} onValueChange={onReasonChange}>
          <SelectTrigger className="w-full bg-background">
            <SelectValue placeholder={isLoading ? "Loading…" : "Choose a reason"} />
          </SelectTrigger>
          <SelectContent>
            {(reasons ?? []).map((reason) => (
              <SelectItem key={reason.id} value={reason.id}>
                {reason.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="lost-note">Details (optional)</Label>
        <textarea
          id="lost-note"
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
          maxLength={500}
          rows={2}
          placeholder="e.g. Bought a resale unit in Rehab"
          className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow,border-color] duration-fast ease-enter focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      </div>
    </div>
  );
}
