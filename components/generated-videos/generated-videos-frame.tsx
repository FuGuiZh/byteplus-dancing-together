"use client";

import type { ReactNode } from "react";

export function GeneratedVideosFrame({
  main,
  rail,
  railToolbar,
  statusBar,
  toolbar,
}: {
  main: ReactNode;
  rail: ReactNode;
  railToolbar: ReactNode;
  statusBar: ReactNode;
  toolbar: ReactNode;
}) {
  return (
    <div className="grid h-full min-w-0 grid-rows-[minmax(0,1fr)_auto] overflow-hidden">
      <div className="min-h-0 min-w-0 overflow-hidden px-5 pt-5 lg:px-8 lg:pt-7">
        <div className="mx-auto grid h-full max-w-[1840px] grid-rows-[auto_minmax(0,1fr)] gap-5 overflow-hidden">
          <header className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_288px] 2xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0">{toolbar}</div>
            <div className="min-w-0">{railToolbar}</div>
          </header>

          <div className="grid min-h-0 min-w-0 gap-5 overflow-hidden xl:grid-cols-[minmax(0,1fr)_288px] 2xl:grid-cols-[minmax(0,1fr)_320px]">
            <main className="min-h-0 min-w-0 overflow-y-auto pr-1">
              {main}
            </main>
            {rail}
          </div>
        </div>
      </div>

      <div className="min-w-0 bg-card px-5 lg:px-8">
        <div className="mx-auto min-w-0 max-w-[1840px]">{statusBar}</div>
      </div>
    </div>
  );
}
