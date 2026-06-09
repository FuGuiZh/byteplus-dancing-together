import { AppShell } from "@/components/app-shell";
import { AssetsWorkspace } from "@/components/assets-workspace";

export default function AssetsPage() {
  return (
    <AppShell
      description="管理图片、视频、音频素材的入库、状态查询和可用性，首页只消费这里已经通过的素材。"
      eyebrow="素材管理"
      title="素材库"
    >
      <AssetsWorkspace />
    </AppShell>
  );
}
