import type {
  LocalVideoTaskStatus,
  VideoTaskStatus,
} from "@/lib/video-generation";

export type GenerationResponse = {
  mode?: string;
  taskId?: string;
  status?: string;
  message?: string;
  error?: {
    code?: string;
    message?: string;
  } | null;
  content?: {
    video_url?: string;
    last_frame_url?: string;
  };
  usage?: Record<string, unknown>;
  diagnostics?: unknown;
  provider?: unknown;
  server?: unknown;
  pollAfterMs?: number;
  pollUrl?: string;
};

export type ApiResponseMessage = {
  action: string;
  durationMs?: number;
  method: string;
  ok: boolean;
  path: string;
  request?: unknown;
  response: unknown;
  responseHeaders?: Record<string, string>;
  status: number;
};

export type UploadedImage = {
  id: string;
  name: string;
  dataUrl: string;
};

export type ConversationMessage =
  | {
      id: string;
      type: "user";
      text: string;
      imageName?: string;
      imageDataUrl?: string;
      imagePreviews?: UploadedImage[];
    }
  | {
      id: string;
      type: "notice";
      text: string;
    }
  | {
      detail?: string;
      id: string;
      title: string;
      type: "activity";
    }
  | ({
      id: string;
      type: "api";
    } & ApiResponseMessage)
  | {
      id: string;
      type: "status";
      status: VideoTaskStatus;
      taskId?: string;
      detail?: string;
      videoUrl?: string;
      lastFrameUrl?: string;
    };

export type TextToVideoSessionRecord = {
  id: string;
  title: string;
  titleCustomized?: boolean;
  createdAt: number;
  updatedAt: number;
  messages: ConversationMessage[];
  taskStatus: LocalVideoTaskStatus;
  taskId: string | null;
  pollIntervalMs: number;
};
