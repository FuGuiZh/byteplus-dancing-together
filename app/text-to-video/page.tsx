import { AppShell } from "@/components/app-shell";
import { TextToVideoWorkspace } from "@/components/text-to-video-workspace";

export default function TextToVideoPage() {
  return (
    <AppShell contentClassName="h-[calc(100dvh-64px)] overflow-hidden p-0 lg:h-dvh lg:p-0">
      <TextToVideoWorkspace />
    </AppShell>
  );
}
