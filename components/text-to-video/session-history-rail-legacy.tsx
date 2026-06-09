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
import { ScrollArea } from "@/components/ui/scroll-area";
import type { TextToVideoSessionRecord } from "@/components/text-to-video/types";

type SessionHistoryRailLegacyProps = {
  activeSessionId: string;
  onCreateSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  onOpenStorageDirectory: (sessionId: string) => void;
  onRenameSession: (sessionId: string, title: string) => void;
  onSelectSession: (sessionId: string) => void;
  sessions: TextToVideoSessionRecord[];
};

export function SessionHistoryRailLegacy({
  activeSessionId,
  onCreateSession,
  onDeleteSession,
  onOpenStorageDirectory,
  onRenameSession,
  onSelectSession,
  sessions,
}: SessionHistoryRailLegacyProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const renameCancelledRef = React.useRef(false);
  const [contextMenu, setContextMenu] = React.useState<{
    sessionId: string;
    title: string;
    x: number;
    y: number;
  } | null>(null);
  const [renamingSession, setRenamingSession] = React.useState<{
    id: string;
    title: string;
  } | null>(null);

  React.useEffect(() => {
    if (!contextMenu) {
      return;
    }

    function closeContextMenu() {
      setContextMenu(null);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeContextMenu();
      }
    }

    window.addEventListener("pointerdown", closeContextMenu);
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("pointerdown", closeContextMenu);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [contextMenu]);

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
    setContextMenu(null);
  }

  return (
    <aside className="h-full min-h-0 w-full min-w-0 overflow-hidden bg-muted/35">
      <ScrollArea
        className="h-full min-h-0 w-full min-w-0"
        viewportClassName="min-w-0 overflow-x-hidden overscroll-contain"
      >
        <div className="box-border w-full min-w-0 max-w-full overflow-hidden px-4 py-5">
          <button
            className="box-border flex h-11 w-full min-w-0 max-w-full items-center gap-3 overflow-hidden rounded-[calc(var(--ui-radius)*1.4)] px-3 text-left text-sm font-medium text-foreground hover:bg-background"
            onClick={onCreateSession}
            type="button"
          >
            <PencilLine className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">新对话</span>
          </button>

          <div className="mt-8 px-3 text-xs font-medium text-muted-foreground">
            历史对话
          </div>

          <div className="mt-3 box-border w-full min-w-0 max-w-full space-y-2 overflow-hidden">
            {sessions.map((session) => (
              <div key={session.id}>
                {renamingSession?.id === session.id ? (
                  <div className="box-border flex h-11 w-full min-w-0 max-w-full items-center gap-2 overflow-hidden rounded-[calc(var(--ui-radius)*1.4)] bg-background px-3 text-left text-sm [box-shadow:var(--ui-shadow-xs)]">
                    <MessageCircle className="size-4 shrink-0" />
                    <input
                      className="min-w-0 flex-1 bg-transparent outline-none"
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
                  <button
                    className={cn(
                      "box-border flex h-11 w-full min-w-0 max-w-full items-center gap-2 overflow-hidden rounded-[calc(var(--ui-radius)*1.4)] px-3 text-left text-sm transition-colors",
                      session.id === activeSessionId
                        ? "bg-background font-bold text-foreground [box-shadow:var(--ui-shadow-xs)]"
                        : "text-muted-foreground hover:bg-background/70 hover:text-foreground"
                    )}
                    onClick={() => onSelectSession(session.id)}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      setContextMenu({
                        sessionId: session.id,
                        title: session.title,
                        x: Math.min(event.clientX, window.innerWidth - 180),
                        y: Math.min(event.clientY, window.innerHeight - 150),
                      });
                    }}
                    type="button"
                  >
                    <MessageCircle className="size-4 shrink-0" />
                    <span className="block min-w-0 flex-1 overflow-hidden truncate whitespace-nowrap">
                      {session.title}
                    </span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>
      {contextMenu ? (
        <div
          className="fixed z-50 w-52 rounded-[calc(var(--ui-radius)*0.9)] border bg-popover p-1 text-popover-foreground [border-width:var(--ui-border-width)] [box-shadow:var(--ui-shadow)]"
          onPointerDown={(event) => event.stopPropagation()}
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <div className="truncate px-3 py-2 text-xs text-muted-foreground">
            {contextMenu.title}
          </div>
          <button
            className="flex h-9 w-full min-w-0 items-center gap-2 rounded-[calc(var(--ui-radius)*0.7)] px-3 text-left text-sm text-popover-foreground hover:bg-muted"
            onClick={() => {
              beginRename(contextMenu.sessionId, contextMenu.title);
            }}
            type="button"
          >
            <Pencil className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate whitespace-nowrap">
              重命名
            </span>
          </button>
          <button
            className="flex h-9 w-full min-w-0 items-center gap-2 rounded-[calc(var(--ui-radius)*0.7)] px-3 text-left text-sm text-popover-foreground hover:bg-muted"
            onClick={() => {
              onOpenStorageDirectory(contextMenu.sessionId);
              setContextMenu(null);
            }}
            type="button"
          >
            <FolderOpen className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate whitespace-nowrap">
              打开文件所在目录
            </span>
          </button>
          <button
            className="flex h-9 w-full min-w-0 items-center gap-2 rounded-[calc(var(--ui-radius)*0.7)] px-3 text-left text-sm text-destructive hover:bg-destructive/10"
            onClick={() => {
              onDeleteSession(contextMenu.sessionId);
              setContextMenu(null);
            }}
            type="button"
          >
            <Trash2 className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate whitespace-nowrap">
              删除会话
            </span>
          </button>
        </div>
      ) : null}
    </aside>
  );
}
