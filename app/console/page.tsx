import { AppShell } from "@/components/app-shell";
import { ConsoleWorkspace } from "@/components/console-workspace";

export default function ConsolePage() {
  return (
    <AppShell
      description="按云控制台颗粒度管理真人认证、素材库、Seedance 任务、回调和运行配置，便于产品和研发对齐真实接入体验。"
      eyebrow="研发控制台"
      title="接口控制台"
    >
      <ConsoleWorkspace />
    </AppShell>
  );
}
