export type AssetStatus = "Processing" | "Active" | "Failed";
export type AssetType = "Image" | "Video" | "Audio";
export type TaskStatus =
  | "idle"
  | "queued"
  | "running"
  | "cancelled"
  | "succeeded"
  | "failed"
  | "expired";

export type StudioAsset = {
  id: string;
  name: string;
  type: AssetType;
  use: string;
  status: AssetStatus;
  assetId: string;
  groupId: string;
  source: string;
  failureReason?: string;
};

export const realPersonProfile = {
  name: "林知夏",
  role: "本人形象档案",
  groupId: "group-20260609001842-realperson",
  projectName: "default",
  verifiedAt: "2026-06-09 00:18",
};

export const initialAssets: StudioAsset[] = [
  {
    id: "asset-hero-portrait",
    name: "本人正面半身照",
    type: "Image",
    use: "主角",
    status: "Active",
    assetId: "asset-20260609002116-person",
    groupId: realPersonProfile.groupId,
    source: "uploads/person-front.jpg",
  },
  {
    id: "asset-outfit",
    name: "银色舞台造型",
    type: "Image",
    use: "服装参考",
    status: "Active",
    assetId: "asset-20260609002304-outfit",
    groupId: realPersonProfile.groupId,
    source: "uploads/outfit-silver.jpg",
  },
  {
    id: "asset-music",
    name: "118 BPM 舞曲片段",
    type: "Audio",
    use: "音乐",
    status: "Active",
    assetId: "asset-20260609002410-audio",
    groupId: realPersonProfile.groupId,
    source: "uploads/beat-118bpm.mp3",
  },
  {
    id: "asset-move",
    name: "侧身转场动作",
    type: "Video",
    use: "动作参考",
    status: "Processing",
    assetId: "asset-20260609002529-motion",
    groupId: realPersonProfile.groupId,
    source: "uploads/motion-turn.mp4",
  },
  {
    id: "asset-invalid",
    name: "多人合照",
    type: "Image",
    use: "主角",
    status: "Failed",
    assetId: "asset-20260609002631-rejected",
    groupId: realPersonProfile.groupId,
    source: "uploads/group-photo.jpg",
    failureReason: "检测到多张人脸，不能加入真人素材组。",
  },
];

export const defaultPrompt =
  "The woman in Image 1 wears the outfit from Image 2 and performs a clean studio dance to the rhythm from Audio 1. Keep the motion confident, bright and close to a short-video launch cut.";

export const seedanceEndpoints = {
  standard: "ep-20260xxxxxxxxx-xxxxx",
  fast: "ep-20260xxxxxxxx-xxxxx",
};
