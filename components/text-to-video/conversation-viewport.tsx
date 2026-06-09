"use client";

import type { ReactNode } from "react";

import { ScrollArea } from "@/components/ui/scroll-area";

type ConversationViewportProps = {
  children: ReactNode;
};

export function ConversationViewport({ children }: ConversationViewportProps) {
  return (
    <ScrollArea
      className="h-full min-h-0"
      viewportClassName="overflow-x-hidden overscroll-contain"
    >
      <div className="mx-auto flex min-h-full w-full min-w-0 max-w-5xl flex-col overflow-hidden px-5 py-10 lg:px-8 lg:py-12">
        {children}
      </div>
    </ScrollArea>
  );
}
