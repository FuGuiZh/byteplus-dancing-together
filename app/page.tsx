import { AppShell } from "@/components/app-shell";
import { GenerationWorkspace } from "@/components/generation-workspace";

export default function Home() {
  return (
    <AppShell
      description="首页只负责把已可用素材组织成 Seedance 2.0 任务，隐藏认证、素材组和研发字段细节。"
      eyebrow="视频生成"
      title="生成视频任务"
    >
      <GenerationWorkspace />
    </AppShell>
  );
}
