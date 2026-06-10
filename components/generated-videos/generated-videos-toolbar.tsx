"use client";

import { LayoutGrid, Search, Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type GeneratedVideoCardDisplayMode = "details" | "video-only";

export function GeneratedVideosToolbar({
  displayMode,
  onDisplayModeChange,
  onSearchQueryChange,
  searchQuery,
}: {
  displayMode: GeneratedVideoCardDisplayMode;
  onDisplayModeChange: (mode: GeneratedVideoCardDisplayMode) => void;
  onSearchQueryChange: (value: string) => void;
  searchQuery: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-center">
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-11 pl-9"
          onChange={(event) => onSearchQueryChange(event.currentTarget.value)}
          placeholder="搜索 TaskId、模型、状态、规格或本地会话"
          value={searchQuery}
        />
      </div>

      <ViewModeToggle
        displayMode={displayMode}
        onToggle={() =>
          onDisplayModeChange(
            displayMode === "details" ? "video-only" : "details"
          )
        }
      />
    </div>
  );
}

function ViewModeToggle({
  displayMode,
  onToggle,
}: {
  displayMode: GeneratedVideoCardDisplayMode;
  onToggle: () => void;
}) {
  const videoOnly = displayMode === "video-only";

  return (
    <Button
      aria-label={`当前为${videoOnly ? "仅视频" : "卡片"}视图，点击切换`}
      aria-pressed={videoOnly}
      className={cn(
        "relative grid h-10 w-[168px] grid-cols-2 gap-0 overflow-hidden rounded-full border-border bg-muted p-1 text-xs shadow-none [border-width:var(--ui-border-width)] hover:bg-muted active:translate-x-0 active:translate-y-0",
        "before:absolute before:bottom-1 before:left-1 before:top-1 before:w-[calc(50%-4px)] before:rounded-full before:bg-primary before:transition-transform before:duration-200 before:ease-out before:[box-shadow:var(--ui-shadow-xs)]",
        videoOnly
          ? "before:translate-x-[calc(100%+4px)]"
          : "before:translate-x-0"
      )}
      onClick={onToggle}
      type="button"
      variant="ghost"
    >
      <span
        className={cn(
          "relative z-10 flex flex-1 items-center justify-center gap-1.5 transition-colors",
          !videoOnly ? "text-primary-foreground" : "text-foreground"
        )}
      >
        <LayoutGrid className="size-4" />
        卡片
      </span>
      <span
        className={cn(
          "relative z-10 flex flex-1 items-center justify-center gap-1.5 transition-colors",
          videoOnly ? "text-primary-foreground" : "text-foreground"
        )}
      >
        <Video className="size-4" />
        仅视频
      </span>
    </Button>
  );
}
