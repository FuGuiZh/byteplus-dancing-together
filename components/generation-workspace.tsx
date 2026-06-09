"use client";

import * as React from "react";
import {
  Activity,
  Clapperboard,
  RefreshCcw,
  Sparkles,
  Wand2,
} from "lucide-react";

import {
  defaultPrompt,
  initialAssets,
  realPersonProfile,
  seedanceEndpoints,
  type StudioAsset,
  type TaskStatus,
} from "@/lib/studio-fixtures";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  AssetCard,
  CodeBlock,
  DataLine,
  FieldLabel,
  taskMeta,
  textareaClassName,
} from "@/components/workspace-primitives";

type GenerationResponse = {
  taskId?: string;
  status?: TaskStatus;
  request?: unknown;
  message?: string;
};

export function GenerationWorkspace() {
  const [assets] = React.useState<StudioAsset[]>(initialAssets);
  const [prompt, setPrompt] = React.useState(defaultPrompt);
  const [useFastEndpoint, setUseFastEndpoint] = React.useState(false);
  const [taskStatus, setTaskStatus] = React.useState<TaskStatus>("idle");
  const [taskId, setTaskId] = React.useState<string | null>(null);
  const [taskRequest, setTaskRequest] = React.useState<unknown>(null);
  const [error, setError] = React.useState<string | null>(null);

  const activeAssets = assets.filter((asset) => asset.status === "Active");
  const selectedImageAssets = activeAssets
    .filter((asset) => asset.type === "Image")
    .slice(0, 2);
  const selectedAudioAsset = activeAssets.find((asset) => asset.type === "Audio");
  const selectedEndpoint = useFastEndpoint
    ? seedanceEndpoints.fast
    : seedanceEndpoints.standard;

  const generationBody = React.useMemo(
    () => ({
      groupId: realPersonProfile.groupId,
      assetRefs: [
        ...selectedImageAssets.map((asset) => ({
          assetId: asset.assetId,
          assetKind: asset.type,
          role: "reference_image",
        })),
        ...(selectedAudioAsset
          ? [
              {
                assetId: selectedAudioAsset.assetId,
                assetKind: selectedAudioAsset.type,
                role: "reference_audio",
              },
            ]
          : []),
      ],
      prompt,
      useFastEndpoint,
      ratio: "9:16",
      duration: useFastEndpoint ? 6 : 8,
      resolution: "720p",
      generateAudio: true,
      safetyIdentifier: "user_hash_47d2b0a18c6f",
    }),
    [prompt, selectedAudioAsset, selectedImageAssets, useFastEndpoint]
  );

  const canCreate =
    taskStatus !== "queued" &&
    taskStatus !== "running" &&
    prompt.trim().length > 0 &&
    selectedImageAssets.length > 0;
  const meta = taskMeta[taskStatus];

  React.useEffect(() => {
    if (taskStatus !== "queued") {
      return;
    }

    const runningTimer = window.setTimeout(() => setTaskStatus("running"), 900);
    const successTimer = window.setTimeout(() => setTaskStatus("succeeded"), 3600);

    return () => {
      window.clearTimeout(runningTimer);
      window.clearTimeout(successTimer);
    };
  }, [taskStatus]);

  async function createTask() {
    setError(null);
    setTaskStatus("queued");
    setTaskRequest(generationBody);

    try {
      const response = await fetch("/api/byteplus/generation-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(generationBody),
      });
      const data = (await response.json()) as GenerationResponse;

      if (!response.ok) {
        throw new Error(data.message ?? "视频生成任务创建失败。");
      }

      setTaskId(data.taskId ?? null);
      setTaskRequest(data.request ?? generationBody);
    } catch (requestError) {
      setTaskStatus("failed");
      setTaskId(null);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "视频生成任务创建失败。"
      );
    }
  }

  function resetTask() {
    setTaskStatus("idle");
    setTaskId(null);
    setTaskRequest(null);
    setError(null);
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section className="min-w-0 space-y-5">
        <div className="rounded-[var(--ui-radius)] border-border bg-card p-5 [border-width:var(--ui-border-width)] [box-shadow:var(--ui-shadow)]">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,0.72fr)_minmax(280px,0.28fr)]">
            <div className="min-w-0">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Badge variant="success">真人档案已认证</Badge>
                <Badge variant="outline">素材 {activeAssets.length} 个可用</Badge>
              </div>
              <FieldLabel
                label="生成描述"
                description="产品首页只承担视频任务创建；素材和认证细节放到素材页与控制台。"
              />
              <textarea
                className={`${textareaClassName} mt-3`}
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
              />
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button disabled={!canCreate} onClick={createTask}>
                  {taskStatus === "queued" || taskStatus === "running" ? (
                    <Activity className="size-4 animate-pulse" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  创建 Seedance 任务
                </Button>
                <Button variant="secondary" onClick={resetTask}>
                  <RefreshCcw className="size-4" />
                  重置
                </Button>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Fast endpoint</span>
                  <Switch
                    checked={useFastEndpoint}
                    onCheckedChange={setUseFastEndpoint}
                  />
                </div>
              </div>
              {error ? (
                <div className="mt-4 rounded-[var(--ui-radius)] border-border bg-destructive px-3 py-2 text-sm text-destructive-foreground [border-width:var(--ui-border-width)]">
                  {error}
                </div>
              ) : null}
            </div>

            <div className="min-w-0 rounded-[var(--ui-radius)] border-border bg-background p-4 [border-width:var(--ui-border-width)]">
              <div className="mb-4 flex items-center justify-between">
                <div className="text-sm font-bold">任务状态</div>
                <Badge variant={meta.badge}>{meta.label}</Badge>
              </div>
              <Progress value={meta.progress} />
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {meta.detail}
              </p>
              <div className="mt-4 space-y-2">
                <DataLine label="Endpoint" value={selectedEndpoint} />
                <DataLine label="TaskId" value={taskId ?? "not_created"} />
                <DataLine label="GroupId" value={realPersonProfile.groupId} />
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {selectedImageAssets.map((asset) => (
            <AssetCard asset={asset} compact key={asset.id} />
          ))}
          {selectedAudioAsset ? (
            <AssetCard asset={selectedAudioAsset} compact />
          ) : null}
        </div>
      </section>

      <aside className="space-y-5">
        <div className="aspect-[9/16] max-h-[620px] overflow-hidden rounded-[var(--ui-radius)] border-border bg-[oklch(0.17_0.012_250)] p-5 text-white [border-width:var(--ui-border-width)]">
          <div className="flex items-center justify-between">
            <Badge variant={taskStatus === "succeeded" ? "success" : "secondary"}>
              {meta.label}
            </Badge>
            <Badge variant="outline">9:16</Badge>
          </div>
          <div className="mt-16 rounded-[var(--ui-radius)] border border-white/20 bg-white/10 p-4">
            <div className="h-48 rounded-[var(--ui-radius)] bg-[linear-gradient(135deg,rgba(255,255,255,0.26),rgba(255,255,255,0.04))]" />
            <div className="mt-4 grid grid-cols-2 gap-2">
              <PreviewRef label="Image 1" value={selectedImageAssets[0]?.name} />
              <PreviewRef label="Image 2" value={selectedImageAssets[1]?.name} />
              <PreviewRef label="Audio 1" value={selectedAudioAsset?.name} />
              <PreviewRef label="Model" value={useFastEndpoint ? "Fast" : "Standard"} />
            </div>
          </div>
          <div className="mt-8 flex items-center gap-2 text-sm">
            <Clapperboard className="size-4" />
            <span>{taskId ?? "等待创建任务"}</span>
          </div>
        </div>

        <div className="rounded-[var(--ui-radius)] border-border bg-card p-4 [border-width:var(--ui-border-width)] [box-shadow:var(--ui-shadow-xs)]">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold">
            <Wand2 className="size-4" />
            Payload 预览
          </div>
          <CodeBlock value={JSON.stringify(taskRequest ?? generationBody, null, 2)} />
        </div>
      </aside>
    </div>
  );
}

function PreviewRef({ label, value }: { label: string; value?: string }) {
  return (
    <div className="min-w-0 rounded-[var(--ui-radius)] border border-white/20 bg-white/10 px-3 py-2">
      <div className="text-[10px] text-white/65">{label}</div>
      <div className="mt-1 truncate text-xs font-bold">{value ?? "未选择"}</div>
    </div>
  );
}
