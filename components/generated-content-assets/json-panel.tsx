"use client";

export function JsonPanel({
  title,
  value,
}: {
  title: string;
  value: unknown;
}) {
  if (value === undefined || value === null) {
    return null;
  }

  return (
    <section className="mt-5 min-w-0 rounded-[var(--ui-radius)] border-border bg-card p-4 [border-width:var(--ui-border-width)]">
      <div className="mb-3 text-sm font-bold">{title}</div>
      <pre className="max-w-full whitespace-pre-wrap break-words rounded-[var(--ui-radius)] bg-[oklch(0.13_0.012_250)] p-4 font-mono text-xs leading-5 text-white">
        {JSON.stringify(value, null, 2)}
      </pre>
    </section>
  );
}
