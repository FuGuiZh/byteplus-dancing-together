import { AppShell } from "@/components/app-shell";
import { AssetsWorkspace } from "@/components/assets-workspace";

export default function AssetLibraryPage() {
  return (
    <AppShell contentClassName="h-[100dvh] overflow-hidden p-0 lg:p-0">
      <AssetsWorkspace />
    </AppShell>
  );
}
