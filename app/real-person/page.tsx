import { AppShell } from "@/components/app-shell";
import { RealPersonWorkspace } from "@/components/real-person-workspace";

export default function RealPersonPage() {
  return (
    <AppShell contentClassName="min-h-[100dvh] bg-background px-5 py-5 lg:px-7 lg:py-7">
      <RealPersonWorkspace />
    </AppShell>
  );
}
