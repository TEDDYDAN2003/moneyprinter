"use client";

import React, { useRef, useState } from "react";
import {
  AlertCircle,
  ImagePlus,
  Images,
  Loader2,
  Maximize2,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import {
  formatFileSize,
  MAX_FILE_SIZE_MB,
  type ChecklistReferenceImage,
} from "@/lib/pullbackReferences";
import type { MarketDirection } from "./PullbackStepDiagram";

interface ChecklistReferenceGalleryProps {
  market: MarketDirection;
  stepId: string;
  stepRoman: string;
  isEditing: boolean;
  images: ChecklistReferenceImage[];
  onUploadFiles: (stepId: string, files: File[]) => Promise<void>;
  onDeleteImage: (stepId: string, image: ChecklistReferenceImage) => Promise<void>;
}

export function ChecklistReferenceGallery({
  market,
  stepId,
  stepRoman,
  isEditing,
  images,
  onUploadFiles,
  onDeleteImage,
}: ChecklistReferenceGalleryProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] =
    useState<ChecklistReferenceImage | null>(null);

  const isBullish = market === "bullish";

  async function processFiles(fileList: FileList | File[]) {
    if (!isEditing) return;
    const files = Array.from(fileList);
    if (files.length === 0) return;

    setErrorMessage(null);
    setUploading(true);
    try {
      await onUploadFiles(stepId, files);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to upload reference image."
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handleDragOver(e: React.DragEvent) {
    if (!isEditing) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!isEditing) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  async function handleDrop(e: React.DragEvent) {
    if (!isEditing) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer?.files?.length) {
      await processFiles(e.dataTransfer.files);
    }
  }

  async function handleDelete(image: ChecklistReferenceImage) {
    if (!isEditing) return;
    setErrorMessage(null);
    setDeletingId(image.id);
    try {
      await onDeleteImage(stepId, image);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to remove reference image."
      );
    } finally {
      setDeletingId(null);
    }
  }

  // If NOT in edit mode and there are no uploaded images, show a subtle read-only note only
  if (!isEditing && images.length === 0) {
    return (
      <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-800/70 bg-[#080B10]/60 px-3.5 py-2.5 text-xs text-slate-500">
        <Images className="h-3.5 w-3.5 shrink-0 text-slate-600" />
        <span>
          No reference images saved for {stepRoman}. Click{" "}
          <strong className="font-medium text-slate-400">Edit</strong> in the
          section header above to upload chart examples.
        </span>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3 border-t border-slate-800/70 pt-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <Images
            className={`h-3.5 w-3.5 ${
              isBullish ? "text-emerald-400" : "text-rose-400"
            }`}
          />
          <span>
            Reference Charts{" "}
            {images.length > 0 && (
              <span className="ml-1 font-mono text-[11px] font-normal text-slate-500">
                ({images.length})
              </span>
            )}
          </span>
        </div>

        {isEditing && (
          <span className="font-mono text-[10px] text-slate-500">
            MAX {MAX_FILE_SIZE_MB} MB / IMAGE
          </span>
        )}
      </div>

      {/* Validation / Upload Error */}
      {errorMessage && (
        <div
          role="alert"
          className="flex items-start justify-between gap-2 rounded-xl border border-rose-500/35 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-200"
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            aria-label="Dismiss error"
            className="text-rose-300 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Existing Uploaded Reference Images Grid (shown in BOTH View Mode & Edit Mode) */}
      {images.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((img) => {
            const isDeleting = deletingId === img.id;
            return (
              <div
                key={img.id}
                className="group relative overflow-hidden rounded-xl border border-slate-800/90 bg-[#080B10] transition hover:border-slate-700"
              >
                <button
                  type="button"
                  onClick={() => setLightboxImage(img)}
                  className="relative block aspect-[16/10] w-full overflow-hidden bg-slate-950 text-left focus:outline-none"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={`${stepRoman} reference — ${img.fileName}`}
                    className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]"
                  />
                  <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-md bg-black/75 px-2 py-1 text-[10px] font-medium text-slate-200 opacity-0 backdrop-blur-xs transition group-hover:opacity-100">
                    <Maximize2 className="h-3 w-3" />
                    Inspect
                  </span>
                </button>

                <div className="flex items-center justify-between gap-2 border-t border-slate-800/80 px-3 py-2">
                  <div className="min-w-0">
                    <p
                      title={img.fileName}
                      className="truncate text-xs font-medium text-slate-200"
                    >
                      {img.fileName}
                    </p>
                    <p className="font-mono text-[10px] text-slate-500">
                      {formatFileSize(img.fileSizeBytes)}
                    </p>
                  </div>

                  {/* Delete control ONLY available in Edit Mode */}
                  {isEditing && (
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => handleDelete(img)}
                      title="Remove reference image"
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/90 text-slate-400 transition hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-50"
                    >
                      {isDeleting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Section — strictly visible ONLY when Edit Mode is enabled */}
      {isEditing && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && !uploading) {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-5 text-center transition ${
            isDragging
              ? isBullish
                ? "border-emerald-400 bg-emerald-500/10"
                : "border-rose-400 bg-rose-500/10"
              : "border-slate-700/80 bg-[#080B10]/80 hover:border-slate-600 hover:bg-[#0B0F17]"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
            multiple
            onChange={(e) => {
              if (e.target.files?.length) {
                processFiles(e.target.files);
              }
            }}
            className="hidden"
          />

          {uploading ? (
            <div className="flex flex-col items-center gap-2 py-1">
              <Loader2
                className={`h-6 w-6 animate-spin ${
                  isBullish ? "text-emerald-400" : "text-rose-400"
                }`}
              />
              <p className="text-xs font-medium text-slate-200">
                Uploading reference image...
              </p>
            </div>
          ) : (
            <>
              <div
                className={`mb-2 flex h-9 w-9 items-center justify-center rounded-xl border ${
                  isBullish
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    : "border-rose-500/30 bg-rose-500/10 text-rose-400"
                }`}
              >
                {isDragging ? (
                  <ImagePlus className="h-4 w-4" />
                ) : (
                  <UploadCloud className="h-4 w-4" />
                )}
              </div>
              <p className="text-xs font-medium text-slate-200">
                Drop chart reference images for{" "}
                <span className="font-mono">{stepRoman}</span> here, or{" "}
                <span
                  className={
                    isBullish
                      ? "text-emerald-400 underline underline-offset-2"
                      : "text-rose-400 underline underline-offset-2"
                  }
                >
                  browse local device
                </span>
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                PNG, JPG, WEBP, GIF, or SVG · Maximum {MAX_FILE_SIZE_MB} MB per
                file
              </p>
            </>
          )}
        </div>
      )}

      {/* Full-Resolution Lightbox Modal */}
      {lightboxImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={lightboxImage.fileName}
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-800 bg-[#0B0F16] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {stepRoman} Reference · {lightboxImage.fileName}
                </p>
                <p className="font-mono text-[11px] text-slate-400">
                  {formatFileSize(lightboxImage.fileSizeBytes)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                aria-label="Close preview"
                className="rounded-lg border border-slate-800 bg-slate-900 p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex max-h-[calc(90vh-60px)] items-center justify-center overflow-auto bg-[#05070B] p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightboxImage.url}
                alt={lightboxImage.fileName}
                className="max-h-[78vh] w-auto rounded-lg object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
