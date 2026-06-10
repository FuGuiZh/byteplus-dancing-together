import Image from "next/image";
import { Check, ChevronDown, ChevronRight, Copy } from "lucide-react";
import * as React from "react";

import {
  textToVideoEmptyPrompts,
  videoTaskStatusCopy,
} from "@/lib/video-generation";
import type {
  ConversationMessage,
  SelectedGenerationAsset,
  UploadedImage,
} from "@/components/text-to-video/types";
import { ResultVideoCard } from "@/components/text-to-video/result-video-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type AssistantMessage = Exclude<ConversationMessage, { type: "user" }>;

type ConversationTurn =
  | {
      id: string;
      message: Extract<ConversationMessage, { type: "user" }>;
      type: "user";
    }
  | {
      id: string;
      messages: AssistantMessage[];
      type: "assistant";
    };

type ActivityOutcome = "loading" | "success" | "failed" | "neutral";

const EMPTY_PROMPT_BASE_DISPLAY_MS = 1500;
const EMPTY_PROMPT_UNIT_DISPLAY_MS = 150;

function getEmptyPromptDisplayDurationMs(prompt: string) {
  let unitCount = 0;
  const tokenMatches = prompt.matchAll(/[A-Za-z]+|[^\s]/gu);

  for (const match of tokenMatches) {
    unitCount += /^[A-Za-z]+$/.test(match[0]) ? 3 : 1;
  }

  return (
    EMPTY_PROMPT_BASE_DISPLAY_MS + unitCount * EMPTY_PROMPT_UNIT_DISPLAY_MS
  );
}

export function ConversationTimeline({
  messages,
}: {
  messages: ConversationMessage[];
}) {
  if (messages.length === 0) {
    return <EmptyPromptCarousel />;
  }

  return (
    <div className="w-full min-w-0 max-w-full overflow-hidden space-y-8 pb-8">
      {groupConversationTurns(messages).map((turn) => (
        <ConversationTurnItem key={turn.id} turn={turn} />
      ))}
    </div>
  );
}

function groupConversationTurns(messages: ConversationMessage[]) {
  const turns: ConversationTurn[] = [];

  for (const message of messages) {
    if (message.type === "user") {
      turns.push({
        id: message.id,
        message,
        type: "user",
      });
      continue;
    }

    const lastTurn = turns.at(-1);
    if (lastTurn?.type === "assistant") {
      lastTurn.messages.push(message);
      continue;
    }

    turns.push({
      id: message.id,
      messages: [message],
      type: "assistant",
    });
  }

  return turns;
}

function EmptyPromptCarousel() {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [previousIndex, setPreviousIndex] = React.useState<number | null>(null);

  React.useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motionQuery.matches) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setActiveIndex((current) => {
        setPreviousIndex(current);
        return (current + 1) % textToVideoEmptyPrompts.length;
      });
    }, getEmptyPromptDisplayDurationMs(textToVideoEmptyPrompts[activeIndex]));

    return () => window.clearTimeout(timeoutId);
  }, [activeIndex]);

  return (
    <div className="grid min-h-[calc(100dvh-260px)] flex-1 place-items-center px-6 text-center">
      <div className="relative grid h-24 w-full max-w-xl place-items-center overflow-hidden">
        {previousIndex !== null ? (
          <p
            aria-hidden="true"
            className="prompt-carousel-exit absolute inset-x-0 text-balance text-lg font-bold leading-8 text-muted-foreground sm:text-xl"
            key={`previous-${previousIndex}-${activeIndex}`}
          >
            {textToVideoEmptyPrompts[previousIndex]}
          </p>
        ) : null}
        <p
          className="prompt-carousel-enter absolute inset-x-0 text-balance text-lg font-bold leading-8 text-muted-foreground sm:text-xl"
          key={`active-${activeIndex}`}
        >
          {textToVideoEmptyPrompts[activeIndex]}
        </p>
      </div>
    </div>
  );
}

function ConversationTurnItem({ turn }: { turn: ConversationTurn }) {
  if (turn.type === "user") {
    const images = getUserMessageImages(turn.message);
    const assets = turn.message.assetPreviews ?? [];

    return (
      <div className="flex justify-end">
        <div className="flex min-w-0 max-w-[min(620px,82vw)] flex-col items-end gap-3">
          {images.length > 0 ? (
            <div className="flex max-w-full flex-wrap justify-end gap-2">
              {images.map((image) => (
                <Image
                  alt={image.name}
                  className="size-24 rounded-[calc(var(--ui-radius)*1.1)] object-cover"
                  height={96}
                  key={image.id}
                  src={image.dataUrl}
                  unoptimized
                  width={96}
                />
              ))}
            </div>
          ) : null}
          {assets.length > 0 ? (
            <div className="flex max-w-full flex-wrap justify-end gap-2">
              {assets.map((asset) => (
                <AssetPreviewTile asset={asset} key={asset.id} />
              ))}
            </div>
          ) : null}
          <div className="min-w-0 max-w-full overflow-hidden rounded-[calc(var(--ui-radius)*1.8)] bg-muted px-6 py-4 text-base leading-7 text-foreground">
            <div className="break-words">{turn.message.text}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AssistantTurnShell copyText={getAssistantTurnCopyText(turn.messages)}>
      <div className="w-full min-w-0 max-w-full overflow-hidden space-y-5">
        {turn.messages.map((message, index) => (
          <AssistantMessageItem
            activityOutcome={getActivityOutcome(turn.messages, index)}
            key={message.id}
            message={message}
          />
        ))}
      </div>
    </AssistantTurnShell>
  );
}

function AssetPreviewTile({ asset }: { asset: SelectedGenerationAsset }) {
  return (
    <div className="w-32 overflow-hidden rounded-[calc(var(--ui-radius)*1.1)] bg-muted text-left">
      {asset.url ? (
        <Image
          alt={asset.name}
          className="h-24 w-full object-cover"
          height={96}
          src={asset.url}
          unoptimized
          width={128}
        />
      ) : (
        <div className="grid h-24 place-items-center text-xs text-muted-foreground">
          素材库图片
        </div>
      )}
      <div className="space-y-0.5 px-2 py-1.5">
        <div className="truncate text-xs font-medium">{asset.name}</div>
        <div className="truncate font-mono text-[10px] text-muted-foreground">
          {asset.id}
        </div>
        <div className="truncate text-[10px] text-muted-foreground">
          {asset.groupType || "素材库"}
        </div>
      </div>
    </div>
  );
}

function getUserMessageImages(
  message: Extract<ConversationMessage, { type: "user" }>
): UploadedImage[] {
  if (message.imagePreviews?.length) {
    return message.imagePreviews;
  }

  if (message.imageDataUrl) {
    return [
      {
        dataUrl: message.imageDataUrl,
        id: `${message.id}-legacy-image`,
        name: message.imageName ?? "用户上传的参考图",
      },
    ];
  }

  return [];
}

function AssistantMessageItem({
  activityOutcome,
  message,
}: {
  activityOutcome: ActivityOutcome;
  message: AssistantMessage;
}) {
  if (message.type === "notice") {
    return (
      <div className="text-sm leading-6 text-muted-foreground">
        {message.text}
      </div>
    );
  }

  if (message.type === "activity") {
    return (
      <div className="flex items-start gap-4 text-base text-foreground">
        <ActivityIndicator outcome={activityOutcome} />
        <div>
          <div>{message.title}</div>
          {message.detail ? (
            <div className="mt-1 font-mono text-xs text-muted-foreground">
              {message.detail}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  if (message.type === "api") {
    return <ApiResponsePanel message={message} />;
  }

  return <StatusMessage message={message} />;
}

function getActivityOutcome(
  messages: AssistantMessage[],
  activityIndex: number
): ActivityOutcome {
  const message = messages[activityIndex];
  if (message?.type !== "activity") {
    return "neutral";
  }

  const laterMessages = messages.slice(activityIndex + 1);
  if (laterMessages.length === 0) {
    return "loading";
  }

  const apiMessage = laterMessages.find((candidate) => candidate.type === "api");
  if (apiMessage?.type === "api") {
    return apiMessage.ok ? "success" : "failed";
  }

  const statusMessage = laterMessages.find(
    (candidate) => candidate.type === "status"
  );
  if (statusMessage?.type === "status") {
    if (statusMessage.status === "failed" || statusMessage.status === "expired") {
      return "failed";
    }

    if (statusMessage.status === "cancelled") {
      return "neutral";
    }

    return "success";
  }

  if (laterMessages.some((candidate) => candidate.type === "notice")) {
    return "neutral";
  }

  return "loading";
}

function ActivityIndicator({ outcome }: { outcome: ActivityOutcome }) {
  if (outcome === "loading") {
    return (
      <span
        aria-label="处理中"
        className="mt-2 flex h-5 w-8 items-center justify-center gap-1.5"
        role="status"
      >
        <span className="activity-loading-dot inline-block size-1.5 rounded-full bg-primary" />
        <span className="activity-loading-dot inline-block size-1.5 rounded-full bg-primary" />
        <span className="activity-loading-dot inline-block size-1.5 rounded-full bg-primary" />
      </span>
    );
  }

  const className = {
    failed: "bg-destructive",
    neutral: "bg-muted-foreground",
    success: "bg-success",
  }[outcome];

  return (
    <span
      aria-label={
        outcome === "success"
          ? "已完成"
          : outcome === "failed"
            ? "失败"
            : "已停止"
      }
      className="mt-2 flex h-5 w-8 items-center justify-center"
      role="status"
    >
      <span className={`size-2 rounded-full ${className}`} />
    </span>
  );
}

function stringifyForCopy(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value, null, 2);
}

function compactLines(lines: Array<string | undefined>) {
  return lines.filter((line): line is string => Boolean(line)).join("\n");
}

function getMessageCopyText(message: AssistantMessage) {
  if (message.type === "notice") {
    return message.text;
  }

  if (message.type === "activity") {
    return compactLines([message.title, message.detail]);
  }

  if (message.type === "api") {
    return compactLines([
      `${message.action}`,
      `Method: ${message.method}`,
      `Path: ${message.path}`,
      `HTTP: ${message.status || "ERR"}`,
      message.durationMs !== undefined
        ? `Duration: ${message.durationMs}ms`
        : undefined,
      message.request !== undefined
        ? `\nRequest JSON:\n${stringifyForCopy(message.request)}`
        : undefined,
      message.responseHeaders
        ? `\nResponse Headers:\n${stringifyForCopy(message.responseHeaders)}`
        : undefined,
      `\nResponse JSON:\n${stringifyForCopy(message.response)}`,
    ]);
  }

  const copy = videoTaskStatusCopy[message.status];

  return compactLines([
    copy.title,
    message.detail ?? copy.detail,
    message.taskId ? `TaskId: ${message.taskId}` : undefined,
    message.videoUrl ? `Video URL: ${message.videoUrl}` : undefined,
    message.lastFrameUrl ? `Last Frame URL: ${message.lastFrameUrl}` : undefined,
  ]);
}

function getAssistantTurnCopyText(messages: AssistantMessage[]) {
  return messages.map(getMessageCopyText).join("\n\n---\n\n");
}

async function copyToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

function AssistantTurnShell({
  children,
  copyText,
}: {
  children: React.ReactNode;
  copyText: string;
}) {
  const [copied, setCopied] = React.useState(false);

  async function handleCopy() {
    await copyToClipboard(copyText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="group/message w-full min-w-0 max-w-full overflow-hidden">
      {children}
      <div className="mt-2 flex h-7 items-center opacity-0 transition-opacity group-hover/message:opacity-100 group-focus-within/message:opacity-100">
        <Button
          aria-label={copied ? "已复制" : "复制内容"}
          className="size-7 rounded-full border-transparent p-0 text-muted-foreground shadow-none hover:bg-muted hover:text-foreground"
          onClick={handleCopy}
          size="icon"
          title={copied ? "已复制" : "复制内容"}
          type="button"
          variant="ghost"
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </Button>
      </div>
    </div>
  );
}

function ApiResponsePanel({
  message,
}: {
  message: Extract<ConversationMessage, { type: "api" }>;
}) {
  const [open, setOpen] = React.useState(!message.ok);
  const ToggleIcon = open ? ChevronDown : ChevronRight;
  const requestJson =
    message.request === undefined
      ? undefined
      : JSON.stringify(message.request, null, 2);
  const responseJson = JSON.stringify(message.response, null, 2);
  const responseHeadersJson = message.responseHeaders
    ? JSON.stringify(message.responseHeaders, null, 2)
    : undefined;

  return (
    <Collapsible
      className="box-border w-full min-w-0 max-w-full overflow-hidden rounded-[calc(var(--ui-radius)*1.2)] border-border bg-card p-4 [border-width:var(--ui-border-width)] [box-shadow:var(--ui-shadow-xs)]"
      onOpenChange={setOpen}
      open={open}
    >
      <CollapsibleTrigger asChild>
        <Button
          className="h-auto w-full justify-between gap-4 border-0 border-transparent p-0 text-left shadow-none [border-width:0] hover:border-transparent hover:bg-transparent active:translate-x-0 active:translate-y-0"
          type="button"
          variant="ghost"
        >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-sm font-bold">
            <ToggleIcon className="size-4 shrink-0" />
            <span>{message.action}</span>
            <Badge className="font-mono text-[11px]" variant="secondary">
              {message.method}
            </Badge>
            {message.durationMs !== undefined ? (
              <Badge className="font-mono text-[11px]" variant="secondary">
                {message.durationMs}ms
              </Badge>
            ) : null}
            <Badge
              className="text-[11px]"
              variant={message.ok ? "success" : "destructive"}
            >
              HTTP {message.status || "ERR"}
            </Badge>
          </div>
          <div className="mt-1 truncate font-mono text-xs text-muted-foreground">
            {message.path}
          </div>
        </div>
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mt-4 grid w-full min-w-0 max-w-full gap-3 overflow-hidden">
          {requestJson ? (
            <JsonBlock label="Request JSON" value={requestJson} />
          ) : null}
          {responseHeadersJson ? (
            <JsonBlock label="Response Headers" value={responseHeadersJson} />
          ) : null}
          <JsonBlock label="Response JSON" value={responseJson} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function JsonBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="w-full min-w-0 max-w-full overflow-hidden">
      <div className="mb-2 text-xs font-bold text-muted-foreground">{label}</div>
      <pre className="box-border block max-h-[360px] w-full min-w-0 max-w-full overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-all rounded-[var(--ui-radius)] bg-[oklch(0.17_0.012_250)] p-4 font-mono text-[11px] leading-5 text-[oklch(0.94_0.012_88)] [overflow-wrap:anywhere]">
        {value}
      </pre>
    </div>
  );
}

function StatusMessage({
  message,
}: {
  message: Extract<ConversationMessage, { type: "status" }>;
}) {
  const copy = videoTaskStatusCopy[message.status];

  if (message.status === "succeeded") {
    return (
      <div className="space-y-5">
        <div className="text-base leading-7">{copy.title}</div>
        <ResultVideoCard videoUrl={message.videoUrl} />
      </div>
    );
  }

  if (message.status === "running" || message.status === "queued") {
    return (
      <div className="space-y-5">
        <div>
          <div className="text-base leading-7">{copy.title}</div>
          <div className="mt-1 text-sm leading-6 text-muted-foreground">
            {message.detail ?? copy.detail}
          </div>
        </div>
        <div className="rounded-[calc(var(--ui-radius)*1.8)] bg-muted px-6 py-5">
          <div className="text-base">{copy.title}...</div>
          <div className="mt-2 text-sm text-muted-foreground">
            {message.taskId ? `TaskId ${message.taskId}` : copy.detail}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-base leading-7">{copy.title}</div>
      <div className="text-sm leading-6 text-muted-foreground">
        {message.detail ?? copy.detail}
      </div>
    </div>
  );
}
