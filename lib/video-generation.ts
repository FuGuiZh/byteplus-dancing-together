export type VideoTaskStatus =
  | "queued"
  | "running"
  | "cancelled"
  | "succeeded"
  | "failed"
  | "expired";

export type LocalVideoTaskStatus = "idle" | VideoTaskStatus;
export type VideoModelMode = "flash" | "standard";
export type VideoDuration = "-1" | "4" | "5" | "8" | "10" | "12" | "15";
export type VideoResolution = "480p" | "720p" | "1080p";
export type VideoRatio =
  | "16:9"
  | "4:3"
  | "1:1"
  | "3:4"
  | "9:16"
  | "21:9"
  | "adaptive";

export const defaultTextToVideoSettings = {
  duration: "4" as VideoDuration,
  modelMode: "flash" as VideoModelMode,
  ratio: "16:9" as VideoRatio,
  resolution: "480p" as VideoResolution,
};

export const videoTaskStatuses: VideoTaskStatus[] = [
  "queued",
  "running",
  "cancelled",
  "succeeded",
  "failed",
  "expired",
];

export const terminalVideoTaskStatuses = new Set<VideoTaskStatus>([
  "cancelled",
  "succeeded",
  "failed",
  "expired",
]);

export const videoRatioOptions: Array<{ value: VideoRatio; label: string }> = [
  { value: "16:9", label: "横向 (16:9)" },
  { value: "4:3", label: "标准 (4:3)" },
  { value: "1:1", label: "方形 (1:1)" },
  { value: "3:4", label: "竖向 (3:4)" },
  { value: "9:16", label: "竖屏 (9:16)" },
  { value: "21:9", label: "宽屏 (21:9)" },
  { value: "adaptive", label: "自适应" },
];

export const videoModelOptions: Array<{
  value: VideoModelMode;
  label: string;
}> = [
  { value: "flash", label: "Flash" },
  { value: "standard", label: "Standard" },
];

export const videoDurationOptions: Array<{
  value: VideoDuration;
  label: string;
}> = [
  { value: "-1", label: "智能时长" },
  { value: "4", label: "4s" },
  { value: "5", label: "5s" },
  { value: "8", label: "8s" },
  { value: "10", label: "10s" },
  { value: "12", label: "12s" },
  { value: "15", label: "15s" },
];

export const videoResolutionOptions: Array<{
  value: VideoResolution;
  label: string;
}> = [
  { value: "480p", label: "480p" },
  { value: "720p", label: "720p" },
  { value: "1080p", label: "1080p" },
];

export const textToVideoEmptyPrompts = [
  "试试用 Seedance 2.0 生成个视频吧？",
  "输入一个画面，Seedance 2.0 会把它变成视频。",
  "从一句话开始，比如：生成一只小猫喝水。",
  "描述主体、场景、动作和镜头，视频会更稳定。",
  "想要短视频感？可以写清楚节奏、光线和运镜。",
  "也可以上传一张参考图，再让 Seedance 2.0 动起来。",
  "试试：雨夜街头，一位舞者在霓虹灯下转身。",
  "试试：阳光厨房里，一只小狗跑向水碗。",
];

export const videoTaskStatusCopy: Record<
  VideoTaskStatus,
  { title: string; detail: string }
> = {
  queued: {
    title: "任务已进入队列",
    detail: "Seedance 已接收任务，正在等待调度。",
  },
  running: {
    title: "正在生成视频",
    detail: "这可能需要几分钟时间，请稍后回来查看完成状态。",
  },
  cancelled: {
    title: "任务已取消",
    detail: "BytePlus 返回 cancelled；文档说明只有 queued 状态的视频生成任务可以取消。",
  },
  succeeded: {
    title: "你的视频准备好了！",
    detail: "生成结果链接通常有时效，请及时保存。",
  },
  failed: {
    title: "生成失败",
    detail: "请查看返回错误，调整提示词或参数后重试。",
  },
  expired: {
    title: "任务已超时",
    detail: "任务在队列或运行中超过过期时间，需要重新生成。",
  },
};

export function isVideoTaskStatus(value: string | undefined): value is VideoTaskStatus {
  return videoTaskStatuses.includes(value as VideoTaskStatus);
}

export function isTerminalVideoTaskStatus(status: VideoTaskStatus) {
  return terminalVideoTaskStatuses.has(status);
}
