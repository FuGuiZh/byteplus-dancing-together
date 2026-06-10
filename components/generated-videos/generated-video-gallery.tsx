"use client";

import { GeneratedContentAssetCard } from "@/components/generated-content-assets/asset-card";
import type { GeneratedContentAssetView } from "@/components/generated-content-assets/types";
import { GeneratedVideosPagination } from "@/components/generated-videos/generated-videos-pagination";
import { EmptyAssetsState } from "@/components/generated-videos/generated-videos-status";
import type { GeneratedVideoCardDisplayMode } from "@/components/generated-videos/generated-videos-toolbar";

export function GeneratedVideoGallery({
  copiedId,
  currentPage,
  displayMode,
  loading,
  pageCount,
  pageSize,
  searchQuery,
  syncing,
  totalCount,
  visibleAssets,
  onCopied,
  onPageChange,
  onSync,
}: {
  copiedId: string | null;
  currentPage: number;
  displayMode: GeneratedVideoCardDisplayMode;
  loading: boolean;
  pageCount: number;
  pageSize: number;
  searchQuery: string;
  syncing: boolean;
  totalCount: number;
  visibleAssets: GeneratedContentAssetView[];
  onCopied: (assetId: string) => void;
  onPageChange: (page: number) => void;
  onSync: () => void;
}) {
  if (loading) {
    return (
      <div className="mt-12 text-sm text-muted-foreground">
        正在读取资产库...
      </div>
    );
  }

  if (totalCount === 0) {
    return (
      <EmptyAssetsState
        onSync={onSync}
        searchQuery={searchQuery}
        syncing={syncing}
      />
    );
  }

  return (
    <section className="mt-5 min-w-0">
      <GeneratedVideosPagination
        currentPage={currentPage}
        pageCount={pageCount}
        pageSize={pageSize}
        totalCount={totalCount}
        onPageChange={onPageChange}
      />

      <div className="mt-6 grid min-w-0 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {visibleAssets.map((asset) => (
          <GeneratedContentAssetCard
            asset={asset}
            copied={copiedId === asset.id}
            key={asset.id}
            onCopied={onCopied}
            variant={displayMode}
          />
        ))}
      </div>

      <GeneratedVideosPagination
        className="mt-6"
        currentPage={currentPage}
        pageCount={pageCount}
        pageSize={pageSize}
        totalCount={totalCount}
        onPageChange={onPageChange}
      />
    </section>
  );
}
