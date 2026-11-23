"use client";

import { useState } from "react";
import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";

export function CopyButton({
  value,
  label = "Copy",
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Copied to clipboard");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy. Select the text and copy it manually.");
    }
  };

  const Icon = copied ? AppIcons.check : AppIcons.copy;

  return (
    <Button type="button" size="sm" variant="outline" className={className} onClick={() => void copy()}>
      <Icon className="size-3.5" />
      {copied ? "Copied" : label}
    </Button>
  );
}
