import * as React from "react";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type IconBubbleProps = {
  children: React.ReactNode;
  href?: string;
  label: string;
  onClick?: () => void;
};

export function ResultVideoCard({ videoUrl }: { videoUrl?: string }) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isMuted, setIsMuted] = React.useState(false);
  const [isReady, setIsReady] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const videoSrc = videoUrl ? withInitialFrameFragment(videoUrl) : undefined;

  async function copyVideoUrl() {
    if (!videoUrl) {
      return;
    }

    await copyToClipboard(videoUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  async function togglePlay() {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (video.paused) {
      await video.play().catch((error: unknown) => {
        setLoadError(
          error instanceof Error ? error.message : "浏览器无法播放该视频。"
        );
      });
      return;
    }

    video.pause();
  }

  function toggleMute() {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    video.muted = !video.muted;
    setIsMuted(video.muted);
  }

  return (
    <div className="group relative aspect-video w-full max-w-3xl overflow-hidden rounded-[calc(var(--ui-radius)*1.8)] bg-[oklch(0.15_0.012_250)]">
      {videoUrl ? (
        <video
          className="absolute inset-0 size-full bg-black object-contain"
          controls
          onCanPlay={() => setIsReady(true)}
          onError={() => {
            const error = videoRef.current?.error;
            setLoadError(getMediaErrorMessage(error));
          }}
          onLoadedData={() => setIsReady(true)}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
          onVolumeChange={(event) =>
            setIsMuted(event.currentTarget.muted || event.currentTarget.volume === 0)
          }
          playsInline
          preload="auto"
          ref={videoRef}
          src={videoSrc}
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center px-6 text-center text-sm leading-6 text-white/70">
          API 未返回 video_url，请查看上一条 Response JSON。
        </div>
      )}
      <div className="absolute right-6 top-5 flex gap-3">
        <IconBubble href={videoUrl} label="下载视频">
          <Download className="size-5" />
        </IconBubble>
        <IconBubble label={copied ? "已复制链接" : "复制视频链接"} onClick={copyVideoUrl}>
          {copied ? <Check className="size-5" /> : <Copy className="size-5" />}
        </IconBubble>
        <IconBubble label={isMuted ? "开启声音" : "静音"} onClick={toggleMute}>
          {isMuted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
        </IconBubble>
      </div>
      {videoUrl && !isPlaying ? (
        <Button
          aria-label={isReady ? "播放视频" : "加载视频"}
          className="absolute left-1/2 top-1/2 size-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-transparent bg-background/75 p-0 text-foreground shadow-none backdrop-blur hover:bg-background/90"
          onClick={togglePlay}
          size="icon"
          type="button"
          variant="ghost"
        >
          {isReady ? (
            <Play className="ml-1 size-6 fill-current" />
          ) : (
            <span className="size-2 animate-pulse rounded-full bg-current" />
          )}
        </Button>
      ) : null}
      {videoUrl && isPlaying ? (
        <Button
          aria-label="暂停视频"
          className="absolute left-1/2 top-1/2 hidden size-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-transparent bg-background/65 p-0 text-foreground shadow-none backdrop-blur hover:bg-background/85 group-hover:flex"
          onClick={togglePlay}
          size="icon"
          type="button"
          variant="ghost"
        >
          <Pause className="size-6 fill-current" />
        </Button>
      ) : null}
      {loadError ? (
        <div className="absolute inset-x-5 bottom-5 rounded-[var(--ui-radius)] bg-background/90 p-4 text-sm text-foreground shadow-lg backdrop-blur">
          <div className="font-bold">视频资源无法读取</div>
          <div className="mt-1 break-words text-muted-foreground">{loadError}</div>
          {videoUrl ? (
            <a
              className="mt-3 inline-flex items-center gap-2 text-primary"
              href={videoUrl}
              rel="noreferrer"
              target="_blank"
            >
              打开原始视频链接
              <ExternalLink className="size-4" />
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function IconBubble({ children, href, label, onClick }: IconBubbleProps) {
  const className =
    "size-12 rounded-full border-transparent bg-background/65 p-0 text-foreground shadow-none backdrop-blur hover:bg-background/85";

  if (href) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button asChild className={className} size="icon" variant="ghost">
            <a
              aria-label={label}
              href={href}
              rel="noreferrer"
              target="_blank"
            >
              {children}
            </a>
          </Button>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          aria-label={label}
          className={className}
          onClick={onClick}
          size="icon"
          type="button"
          variant="ghost"
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function withInitialFrameFragment(url: string) {
  return url.includes("#") ? url : `${url}#t=0.001`;
}

function getMediaErrorMessage(error: MediaError | null | undefined) {
  if (!error) {
    return "浏览器未提供具体错误。请复制视频链接到新标签页验证网络和链接有效期。";
  }

  const messages: Record<number, string> = {
    [MediaError.MEDIA_ERR_ABORTED]: "视频加载被浏览器或用户中止。",
    [MediaError.MEDIA_ERR_NETWORK]:
      "视频下载过程中发生网络错误。请确认本机能访问 BytePlus/TOS 视频域名。",
    [MediaError.MEDIA_ERR_DECODE]: "浏览器无法解码该视频文件。",
    [MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED]:
      "浏览器不支持该视频源，或视频链接已经过期/不可访问。",
  };

  return messages[error.code] ?? `浏览器返回未知媒体错误：${error.code}`;
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
