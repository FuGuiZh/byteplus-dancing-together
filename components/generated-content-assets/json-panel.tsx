"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

export function JsonPanel({
  defaultOpen = false,
  title,
  value,
}: {
  defaultOpen?: boolean;
  title: string;
  value: unknown;
}) {
  const [open, setOpen] = React.useState(defaultOpen);

  if (value === undefined || value === null) {
    return null;
  }

  const ToggleIcon = open ? ChevronDown : ChevronRight;

  return (
    <section className="mt-5 min-w-0 rounded-[var(--ui-radius)] border-border bg-card p-4 [border-width:var(--ui-border-width)]">
      <button
        className={cn(
          "flex w-full items-center justify-between gap-3 text-left text-sm font-bold",
          open && "mb-3"
        )}
        onClick={() => setOpen((currentOpen) => !currentOpen)}
        type="button"
      >
        <span className="flex min-w-0 items-center gap-2">
          <ToggleIcon className="size-4 shrink-0" />
          <span className="truncate">{title}</span>
        </span>
        <span className="shrink-0 text-xs font-normal text-muted-foreground">
          {open ? "收起" : "展开"}
        </span>
      </button>
      {open ? (
        <pre className="max-w-full whitespace-pre-wrap break-words rounded-[var(--ui-radius)] bg-[oklch(0.13_0.012_250)] p-4 font-mono text-xs leading-5 text-white">
          {JSON.stringify(value, null, 2)}
        </pre>
      ) : null}
    </section>
  );
}
