"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import * as React from "react";

import type { ApiSnapshot } from "@/components/assets/assets-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function formatJson(value: unknown) {
  if (value === undefined) {
    return "undefined";
  }

  return JSON.stringify(value, null, 2);
}

export function AssetsCodePanel({
  snapshot,
  defaultOpen = false,
}: {
  snapshot: ApiSnapshot | null;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);

  const visibleOpen = snapshot?.error ? true : open;

  if (!snapshot) {
    return (
      <div className="rounded-[var(--ui-radius)] border-border bg-muted/40 p-4 text-sm text-muted-foreground [border-width:var(--ui-border-width)]">
        执行素材组或素材操作后，这里会显示请求路径、HTTP 状态和原始响应。
      </div>
    );
  }

  return (
    <section className="min-w-0 max-w-full overflow-hidden rounded-[var(--ui-radius)] border-border bg-card [border-width:var(--ui-border-width)]">
      <button
        className="flex w-full min-w-0 items-center justify-between gap-3 px-4 py-3 text-left"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span className="flex min-w-0 items-center gap-2">
          {visibleOpen ? (
            <ChevronDown className="size-4 shrink-0" />
          ) : (
            <ChevronRight className="size-4 shrink-0" />
          )}
          <span className="truncate text-sm font-bold">{snapshot.label}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <Badge variant="outline">{snapshot.method}</Badge>
          {typeof snapshot.elapsedMs === "number" ? (
            <Badge variant="secondary">{snapshot.elapsedMs}ms</Badge>
          ) : null}
          {typeof snapshot.status === "number" ? (
            <Badge
              variant={snapshot.status >= 400 ? "destructive" : "success"}
            >
              HTTP {snapshot.status}
            </Badge>
          ) : null}
        </span>
      </button>

      {visibleOpen ? (
        <div className="min-w-0 max-w-full space-y-3 overflow-hidden border-t border-border px-4 py-4">
          <div className="truncate font-mono text-xs text-muted-foreground">
            {snapshot.path}
          </div>
          {snapshot.error ? (
            <div className="rounded-[var(--ui-radius)] border-border bg-destructive px-3 py-2 text-sm text-destructive-foreground [border-width:var(--ui-border-width)]">
              {snapshot.error}
            </div>
          ) : null}
          <PayloadBlock label="Request JSON" value={snapshot.request} />
          <PayloadBlock label="Response JSON" value={snapshot.response} />
          <Button
            onClick={() => {
              void navigator.clipboard.writeText(formatJson(snapshot));
            }}
            size="sm"
            type="button"
            variant="outline"
          >
            复制完整响应
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function PayloadBlock({ label, value }: { label: string; value: unknown }) {
  if (value === undefined) {
    return null;
  }

  return (
    <div className="min-w-0 max-w-full overflow-hidden">
      <div className="mb-2 text-xs font-bold text-muted-foreground">{label}</div>
      <pre className="max-h-72 min-w-0 max-w-full overflow-auto whitespace-pre-wrap break-words rounded-[var(--ui-radius)] bg-[oklch(0.17_0.012_250)] p-3 font-mono text-[11px] leading-5 text-[oklch(0.94_0.012_88)]">
        {formatJson(value)}
      </pre>
    </div>
  );
}
