"use client";

import type { ReactNode } from "react";

type TextToVideoPageFrameProps = {
  composer: ReactNode;
  conversation: ReactNode;
  history: ReactNode;
};

export function TextToVideoPageFrame({
  composer,
  conversation,
  history,
}: TextToVideoPageFrameProps) {
  return (
    <div className="grid h-full min-h-0 grid-cols-1 overflow-hidden bg-background lg:grid-cols-[minmax(0,1fr)_242px]">
      <section className="grid min-h-0 min-w-0 grid-rows-[minmax(0,1fr)_auto] overflow-hidden">
        <div className="min-h-0 min-w-0 overflow-hidden">{conversation}</div>
        <div className="min-w-0 bg-background px-4 py-4 lg:px-8">
          {composer}
        </div>
      </section>

      <div className="hidden min-h-0 min-w-0 overflow-hidden lg:block">
        {history}
      </div>
    </div>
  );
}
