"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function GeneratedVideosPagination({
  className,
  currentPage,
  pageCount,
  pageSize,
  totalCount,
  onPageChange,
}: {
  className?: string;
  currentPage: number;
  pageCount: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}) {
  const start = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalCount);
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < pageCount;

  function jumpToPage(value: string) {
    const numberValue = Number(value);
    if (!Number.isInteger(numberValue)) {
      return;
    }

    onPageChange(Math.min(pageCount, Math.max(1, numberValue)));
  }

  return (
    <div
      className={cn(
        "flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-[var(--ui-radius)] border-border bg-card px-4 py-3 text-sm [border-width:var(--ui-border-width)]",
        className
      )}
    >
      <div className="min-w-0 text-muted-foreground">
        第 {start}-{end} 个，共 {totalCount} 个视频，每页 {pageSize} 个
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <Button
          disabled={!canGoPrevious}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          size="sm"
          type="button"
          variant="outline"
        >
          <ChevronLeft className="mr-1 size-4" />
          上一页
        </Button>
        <Badge variant="secondary">
          {currentPage} / {pageCount}
        </Badge>
        <label className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
          跳到
          <Input
            className="h-8 w-16 text-center font-mono text-sm"
            defaultValue={currentPage}
            key={currentPage}
            max={pageCount}
            min={1}
            onBlur={(event) => jumpToPage(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                jumpToPage(event.currentTarget.value);
                event.currentTarget.blur();
              }
            }}
            type="number"
          />
          页
        </label>
        <Button
          disabled={!canGoNext}
          onClick={() => onPageChange(Math.min(pageCount, currentPage + 1))}
          size="sm"
          type="button"
          variant="outline"
        >
          下一页
          <ChevronRight className="ml-1 size-4" />
        </Button>
      </div>
    </div>
  );
}
