"use client";

import type { ReactNode } from "react";

export function AssetsFrame({
  browser,
  inspector,
  sidebar,
  statusBar,
  toolbar,
}: {
  browser: ReactNode;
  inspector: ReactNode;
  sidebar: ReactNode;
  statusBar: ReactNode;
  toolbar: ReactNode;
}) {
  return (
    <div className="grid h-full w-full min-w-0 max-w-full grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden bg-background">
      <header className="min-w-0 max-w-full overflow-hidden border-b border-border bg-muted/30 px-4 py-3">
        {toolbar}
      </header>

      <div className="grid min-h-0 min-w-0 max-w-full grid-cols-1 grid-rows-[160px_minmax(0,1fr)_minmax(260px,38vh)] overflow-hidden min-[1500px]:grid-cols-[minmax(180px,220px)_minmax(0,1fr)_minmax(280px,340px)] min-[1500px]:grid-rows-none">
        <aside className="min-h-0 min-w-0 max-w-full overflow-hidden border-b border-border bg-muted/20 min-[1500px]:border-b-0 min-[1500px]:border-r">
          {sidebar}
        </aside>
        <main className="min-h-0 min-w-0 max-w-full overflow-hidden bg-background">
          {browser}
        </main>
        <aside className="min-h-0 min-w-0 max-w-full overflow-hidden border-t border-border bg-muted/20 min-[1500px]:border-l min-[1500px]:border-t-0">
          {inspector}
        </aside>
      </div>

      <footer className="min-w-0 max-w-full overflow-hidden bg-card px-4">
        {statusBar}
      </footer>
    </div>
  );
}
