"use client";

import Image from "next/image";
import * as React from "react";
import {
  Activity,
  ImagePlus,
  Send,
  Square,
  X,
} from "lucide-react";

import {
  videoDurationOptions,
  videoModelOptions,
  videoRatioOptions,
  videoResolutionOptions,
  type VideoDuration,
  type VideoModelMode,
  type VideoRatio,
  type VideoResolution,
} from "@/lib/video-generation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { UploadedImage } from "@/components/text-to-video/types";

type VideoPromptComposerProps = {
  canSubmit: boolean;
  duration: VideoDuration;
  inputError: string | null;
  isBusy: boolean;
  isUploading: boolean;
  modelMode: VideoModelMode;
  onImagesSelected: (files: File[]) => void;
  onRemoveImage: (imageId: string) => void;
  onStop: () => void;
  onSubmit: () => void;
  prompt: string;
  ratio: VideoRatio;
  resolution: VideoResolution;
  setDuration: (value: VideoDuration) => void;
  setModelMode: (value: VideoModelMode) => void;
  setPrompt: (value: string) => void;
  setRatio: (value: VideoRatio) => void;
  setResolution: (value: VideoResolution) => void;
  uploadedImages: UploadedImage[];
};

export function VideoPromptComposer({
  canSubmit,
  duration,
  inputError,
  isBusy,
  isUploading,
  modelMode,
  onImagesSelected,
  onRemoveImage,
  onStop,
  onSubmit,
  prompt,
  ratio,
  resolution,
  setDuration,
  setModelMode,
  setPrompt,
  setRatio,
  setResolution,
  uploadedImages,
}: VideoPromptComposerProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  function handlePaste(event: React.ClipboardEvent<HTMLFormElement>) {
    if (isBusy || isUploading) {
      return;
    }

    const imageFiles = getImageFilesFromClipboard(event.clipboardData);
    if (imageFiles.length === 0) {
      return;
    }

    event.preventDefault();
    onImagesSelected(imageFiles);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (files.length > 0) {
      onImagesSelected(files);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <form
      className="mx-auto w-full min-w-0 max-w-4xl rounded-[calc(var(--ui-radius)*1.8)] border-border bg-card p-3 [border-width:var(--ui-border-width)] [box-shadow:0_14px_40px_color-mix(in_oklch,var(--ring)_14%,transparent)]"
      onPaste={handlePaste}
      onSubmit={handleSubmit}
    >
      <input
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        multiple
        ref={fileInputRef}
        type="file"
      />
      <label className="sr-only" htmlFor="text-to-video-prompt">
        视频生成提示词
      </label>

      {uploadedImages.length > 0 ? (
        <div className="mb-3 flex min-w-0 flex-wrap gap-2">
          {uploadedImages.map((image) => (
            <div
              className="group/image relative size-24 overflow-hidden rounded-[calc(var(--ui-radius)*1.1)] bg-muted"
              key={image.id}
            >
              <Image
                alt={image.name}
                className="size-full object-cover"
                height={96}
                src={image.dataUrl}
                unoptimized
                width={96}
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    aria-label={`移除图片 ${image.name}`}
                    className="absolute right-1.5 top-1.5 hidden size-6 rounded-full bg-background/90 p-0 text-foreground shadow-sm backdrop-blur hover:bg-background group-hover/image:inline-flex focus:inline-flex"
                    onClick={() => onRemoveImage(image.id)}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <X className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>移除图片</TooltipContent>
              </Tooltip>
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_140px_44px] md:items-start">
        <Textarea
          className="min-h-20 resize-none border-0 bg-transparent px-2 py-2 text-base leading-6 shadow-none focus-visible:ring-0"
          id="text-to-video-prompt"
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder=""
          rows={3}
          value={prompt}
        />
        <SelectPill
          ariaLabel="选择模型"
          className="md:w-[140px]"
          onChange={setModelMode}
          options={videoModelOptions}
          value={modelMode}
        />
        <Button
          aria-label={isBusy ? "停止生成" : "创建视频任务"}
          className={cn(
            "size-10 shrink-0 rounded-full p-0",
            isBusy && "bg-muted text-foreground hover:bg-muted"
          )}
          disabled={!isBusy && !canSubmit}
          onClick={isBusy ? onStop : undefined}
          size="icon"
          type={isBusy ? "button" : "submit"}
        >
          {isBusy ? (
            <Square className="size-3 fill-current" />
          ) : isUploading ? (
            <Activity className="size-4 animate-pulse" />
          ) : (
            <Send className="size-4" />
          )}
        </Button>
      </div>

      <div className="mt-3 grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,0.8fr)]">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="h-9 rounded-full shadow-none"
              disabled={isUploading || isBusy}
              onClick={() => fileInputRef.current?.click()}
              type="button"
              variant="outline"
            >
              {isUploading ? (
                <Activity className="size-4 animate-pulse" />
              ) : (
                <ImagePlus className="size-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>上传参考图片</TooltipContent>
        </Tooltip>
        <SelectPill
          ariaLabel="选择画幅"
          openDirection="up"
          onChange={setRatio}
          options={videoRatioOptions}
          value={ratio}
        />
        <SelectPill
          ariaLabel="选择时长"
          openDirection="up"
          onChange={setDuration}
          options={videoDurationOptions}
          value={duration}
        />
        <SelectPill
          ariaLabel="选择清晰度"
          openDirection="up"
          onChange={setResolution}
          options={
            modelMode === "flash"
              ? videoResolutionOptions.filter(
                  (option) => option.value !== "1080p"
                )
              : videoResolutionOptions
          }
          value={resolution}
        />
      </div>

      {inputError ? (
        <div className="mt-2 text-xs text-destructive">{inputError}</div>
      ) : null}
    </form>
  );
}

function getImageFilesFromClipboard(clipboardData: DataTransfer) {
  return Array.from(clipboardData.items)
    .filter((candidate) => candidate.type.startsWith("image/"))
    .map((item, index) => {
      const file = item.getAsFile();
      if (!file) {
        return null;
      }

      const extension = getImageExtension(file.type);
      const fallbackName = `pasted-image-${Date.now()}-${index + 1}.${extension}`;
      const fileName =
        file.name && file.name !== "image.png" ? file.name : fallbackName;

      return new File([file], fileName, {
        lastModified: Date.now(),
        type: file.type || "image/png",
      });
    })
    .filter((file): file is File => Boolean(file));
}

function getImageExtension(mimeType: string) {
  if (mimeType === "image/jpeg") {
    return "jpg";
  }

  if (mimeType === "image/webp") {
    return "webp";
  }

  if (mimeType === "image/gif") {
    return "gif";
  }

  return "png";
}

function SelectPill<TValue extends string>({
  ariaLabel,
  className,
  openDirection = "down",
  onChange,
  options,
  value,
}: {
  ariaLabel: string;
  className?: string;
  openDirection?: "down" | "up";
  onChange: (value: TValue) => void;
  options: Array<{ value: TValue; label: string }>;
  value: TValue;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <Select
        onValueChange={(nextValue) => onChange(nextValue as TValue)}
        value={value}
      >
        <SelectTrigger
          aria-label={ariaLabel}
          className="h-9 w-full min-w-0 rounded-full border-border bg-background shadow-none [border-width:var(--ui-border-width)]"
          iconDirection={openDirection}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent
          position={openDirection === "up" ? "popper" : "item-aligned"}
          side={openDirection === "up" ? "top" : "bottom"}
          sideOffset={openDirection === "up" ? 6 : 0}
        >
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
