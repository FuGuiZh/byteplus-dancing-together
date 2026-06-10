"use client";

import * as React from "react";
import {
  FolderOpen,
  MessageCircle,
  Pencil,
  PencilLine,
  Trash2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { TextToVideoSessionRecord } from "@/components/text-to-video/types";

type SessionHistoryRailProps = {
  activeSessionId: string;
  onCreateSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  onOpenStorageDirectory: (sessionId: string) => void;
  onRenameSession: (sessionId: string, title: string) => void;
  onSelectSession: (sessionId: string) => void;
  sessions: TextToVideoSessionRecord[];
};

export function SessionHistoryRail({
  activeSessionId,
  onCreateSession,
  onDeleteSession,
  onOpenStorageDirectory,
  onRenameSession,
  onSelectSession,
  sessions,
}: SessionHistoryRailProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const renameCancelledRef = React.useRef(false);
  const [renamingSession, setRenamingSession] = React.useState<{
    id: string;
    title: string;
  } | null>(null);

  React.useEffect(() => {
    if (!renamingSession) {
      return;
    }

    window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  }, [renamingSession]);

  function commitRename() {
    if (!renamingSession) {
      return;
    }

    if (renameCancelledRef.current) {
      renameCancelledRef.current = false;
      setRenamingSession(null);
      return;
    }

    onRenameSession(renamingSession.id, renamingSession.title);
    setRenamingSession(null);
  }

  function beginRename(sessionId: string, title: string) {
    renameCancelledRef.current = false;
    setRenamingSession({
      id: sessionId,
      title,
    });
  }

  return (
    <aside className="h-full min-h-0 w-full min-w-0 overflow-hidden bg-card/95">
      <ScrollArea
        className="h-full min-h-0 w-full min-w-0"
        viewportClassName="min-w-0 overflow-x-hidden overscroll-contain"
      >
        <div className="box-border w-full min-w-0 max-w-full overflow-hidden px-4 py-5">
          <Button
            className="h-11 w-full min-w-0 justify-start rounded-[calc(var(--ui-radius)*1.4)] px-3 text-left shadow-none"
            onClick={onCreateSession}
            type="button"
            variant="ghost"
          >
            <PencilLine className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">新对话</span>
          </Button>

          <div className="mt-8 px-3 text-xs font-medium text-muted-foreground">
            历史对话
          </div>

          <div className="mt-3 box-border w-full min-w-0 max-w-full space-y-2 overflow-hidden">
            {sessions.map((session) => (
              <div key={session.id}>
                {renamingSession?.id === session.id ? (
                  <div
                    className={cn(
                      "box-border flex h-11 w-full min-w-0 max-w-full items-center gap-2 overflow-hidden rounded-[calc(var(--ui-radius)*1.4)] bg-background px-3 text-left text-sm [box-shadow:var(--ui-shadow-xs)]"
                    )}
                  >
                    <MessageCircle className="size-4 shrink-0" />
                    <Input
                      className="h-auto min-w-0 flex-1 border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0"
                      onBlur={commitRename}
                      onChange={(event) =>
                        setRenamingSession((current) =>
                          current
                            ? { ...current, title: event.target.value }
                            : current
                        )
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          commitRename();
                        }

                        if (event.key === "Escape") {
                          event.preventDefault();
                          renameCancelledRef.current = true;
                          setRenamingSession(null);
                        }
                      }}
                      ref={inputRef}
                      value={renamingSession.title}
                    />
                  </div>
                ) : (
                  <ContextMenu>
                    <ContextMenuTrigger asChild>
                      <Button
                        className={cn(
                          "h-11 w-full min-w-0 justify-start rounded-[calc(var(--ui-radius)*1.4)] px-3 text-left shadow-none",
                          session.id === activeSessionId
                            ? "font-bold"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                        onClick={() => onSelectSession(session.id)}
                        type="button"
                        variant={
                          session.id === activeSessionId ? "secondary" : "ghost"
                        }
                      >
                        <MessageCircle className="size-4 shrink-0" />
                        <span className="block min-w-0 flex-1 overflow-hidden truncate whitespace-nowrap">
                          {session.title}
                        </span>
                      </Button>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="w-52">
                      <ContextMenuLabel className="truncate text-xs font-normal text-muted-foreground">
                        {session.title}
                      </ContextMenuLabel>
                      <ContextMenuSeparator />
                      <ContextMenuItem
                        className="h-9 min-w-0"
                        onSelect={() => beginRename(session.id, session.title)}
                      >
                        <Pencil className="size-4 shrink-0" />
                        <span className="min-w-0 flex-1 truncate whitespace-nowrap">
                          重命名
                        </span>
                      </ContextMenuItem>
                      <ContextMenuItem
                        className="h-9 min-w-0"
                        onSelect={() => onOpenStorageDirectory(session.id)}
                      >
                        <FolderOpen className="size-4 shrink-0" />
                        <span className="min-w-0 flex-1 truncate whitespace-nowrap">
                          打开文件所在目录
                        </span>
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem
                        className="h-9 min-w-0"
                        onSelect={() => onDeleteSession(session.id)}
                        variant="destructive"
                      >
                        <Trash2 className="size-4 shrink-0" />
                        <span className="min-w-0 flex-1 truncate whitespace-nowrap">
                          删除会话
                        </span>
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                )}
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}
