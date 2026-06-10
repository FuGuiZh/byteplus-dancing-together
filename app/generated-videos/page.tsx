import { AppShell } from "@/components/app-shell";
import { GeneratedVideosWorkspace } from "@/components/generated-videos-workspace";

export default function GeneratedVideosPage() {
  return (
    <AppShell contentClassName="h-[100dvh] overflow-hidden p-0 lg:p-0">
      <GeneratedVideosWorkspace />
    </AppShell>
  );
}
