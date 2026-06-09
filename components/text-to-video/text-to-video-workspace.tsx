"use client";

import { ConversationTimeline } from "@/components/text-to-video/conversation-timeline";
import { ConversationViewport } from "@/components/text-to-video/conversation-viewport";
import { SessionHistoryRail } from "@/components/text-to-video/session-history-rail";
import { TextToVideoPageFrame } from "@/components/text-to-video/text-to-video-page-frame";
import { useTextToVideoSession } from "@/components/text-to-video/use-text-to-video-session";
import { VideoPromptComposer } from "@/components/text-to-video/video-prompt-composer";

export function TextToVideoWorkspace() {
  const session = useTextToVideoSession();

  return (
    <TextToVideoPageFrame
      composer={
        <VideoPromptComposer
          canSubmit={session.canSubmit}
          duration={session.duration}
          inputError={session.inputError}
          isBusy={session.isBusy}
          isUploading={session.isUploading}
          modelMode={session.modelMode}
          onImagesSelected={session.uploadImageFiles}
          onRemoveImage={session.removeUploadedImage}
          onStop={session.stopCurrentTask}
          onSubmit={session.submitPrompt}
          prompt={session.prompt}
          ratio={session.ratio}
          resolution={session.resolution}
          setDuration={session.setDuration}
          setModelMode={session.setModelMode}
          setPrompt={session.setPrompt}
          setRatio={session.setRatio}
          setResolution={session.setResolution}
          uploadedImages={session.uploadedImages}
        />
      }
      conversation={
        <ConversationViewport>
          <ConversationTimeline messages={session.messages} />
        </ConversationViewport>
      }
      history={
        <SessionHistoryRail
          activeSessionId={session.activeSessionId}
          onCreateSession={session.createSession}
          onDeleteSession={session.deleteSession}
          onOpenStorageDirectory={session.openSessionStorageDirectory}
          onRenameSession={session.renameSession}
          onSelectSession={session.selectSession}
          sessions={session.sessions}
        />
      }
    />
  );
}
