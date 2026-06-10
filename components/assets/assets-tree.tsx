"use client";

import { Database, Folder, FolderOpen, Home, Layers3 } from "lucide-react";
import type * as React from "react";

import type {
  AssetCounts,
  AssetGroupItem,
  AssetScope,
} from "@/components/assets/assets-types";
import { getGroupTypeLabel } from "@/components/assets/assets-utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export function AssetsTree({
  counts,
  groups,
  onScopeChange,
  scope,
}: {
  counts: AssetCounts;
  groups: AssetGroupItem[];
  onScopeChange: (scope: AssetScope) => void;
  scope: AssetScope;
}) {
  const groupTypes = Array.from(
    new Set(groups.map((group) => group.groupType).filter(Boolean))
  );

  return (
    <div className="grid h-full min-w-0 grid-rows-[auto_minmax(0,1fr)]">
      <div className="border-b border-border px-4 py-4">
        <div className="text-sm font-bold">素材资源</div>
        <div className="mt-1 text-xs text-muted-foreground">
          组是文件夹，素材是文件。
        </div>
      </div>

      <ScrollArea className="min-h-0">
        <div className="space-y-5 p-3">
          <section className="space-y-1">
            <TreeButton
              active={scope.type === "root"}
              count={counts.groups}
              icon={Home}
              label="根目录"
              onClick={() => onScopeChange({ type: "root" })}
            />
            <TreeButton
              active={scope.type === "all-assets"}
              count={counts.assets}
              icon={Database}
              label="全部素材"
              onClick={() => onScopeChange({ type: "all-assets" })}
            />
          </section>

          <section className="space-y-1">
            <TreeHeading>资源类型</TreeHeading>
            {groupTypes.map((groupType) => (
              <TreeButton
                active={
                  scope.type === "group-type" && scope.groupType === groupType
                }
                count={
                  groups.filter((group) => group.groupType === groupType).length
                }
                icon={Layers3}
                key={groupType}
                label={getGroupTypeLabel(groupType)}
                onClick={() => onScopeChange({ type: "group-type", groupType })}
              />
            ))}
          </section>

          <section className="space-y-1">
            <TreeHeading>素材组</TreeHeading>
            {groups.map((group) => (
              <TreeButton
                active={scope.type === "group" && scope.groupId === group.id}
                icon={
                  scope.type === "group" && scope.groupId === group.id
                    ? FolderOpen
                    : Folder
                }
                key={group.id}
                label={group.name}
                meta={group.groupType}
                onClick={() => onScopeChange({ type: "group", groupId: group.id })}
              />
            ))}
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}

function TreeHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
      {children}
    </div>
  );
}

function TreeButton({
  active,
  count,
  icon: Icon,
  label,
  meta,
  onClick,
}: {
  active: boolean;
  count?: number;
  icon: React.ElementType;
  label: string;
  meta?: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "flex w-full min-w-0 items-center gap-2 rounded-[var(--ui-radius)] px-2 py-2 text-left text-sm hover:bg-muted",
        active && "bg-secondary text-secondary-foreground"
      )}
      onClick={onClick}
      type="button"
    >
      <Icon className="size-4 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold">{label}</span>
        {meta ? (
          <span className="block truncate text-[11px] text-muted-foreground">
            {getGroupTypeLabel(meta)}
          </span>
        ) : null}
      </span>
      {typeof count === "number" ? (
        <Badge className="shrink-0 px-2 py-0.5" variant="outline">
          {count}
        </Badge>
      ) : null}
    </button>
  );
}
