import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { MarketDirection } from "@/components/PullbackStepDiagram";

export const PULLBACK_BUCKET = "pullback-references";
export const MAX_FILE_SIZE_MB = 10;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024; // 10,485,760 bytes

export const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

export interface ChecklistReferenceImage {
  id: string;
  market: MarketDirection;
  stepId: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  storagePath: string;
  url: string;
  createdAt: string;
  isLocalPreview?: boolean;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function validateReferenceFile(file: File): string | null {
  if (!file || file.size <= 0) {
    return `"${file?.name || "File"}" is empty.`;
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `"${file.name}" (${formatFileSize(
      file.size
    )}) exceeds the maximum 10 MB file size limit.`;
  }

  if (!ALLOWED_IMAGE_MIME_TYPES.has(file.type)) {
    return `"${file.name}" has an unsupported format (${
      file.type || "unknown"
    }). Please upload PNG, JPG, WEBP, GIF, or SVG images.`;
  }

  return null;
}

function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

// ============================================================================
// IndexedDB Preview Fallback (used ONLY before Supabase .env.local is added)
// ============================================================================

const IDB_NAME = "moneyprinter_preview_refs_v1";
const IDB_STORE = "checklist_images";

interface StoredPreviewRecord {
  id: string;
  market: MarketDirection;
  stepId: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  storagePath: string;
  createdAt: string;
  blob: Blob;
}

function openPreviewDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = window.indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        const store = db.createObjectStore(IDB_STORE, { keyPath: "id" });
        store.createIndex("by_step", "stepId", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function listPreviewReferences(): Promise<
  Record<string, ChecklistReferenceImage[]>
> {
  if (typeof window === "undefined" || !window.indexedDB) return {};

  const db = await openPreviewDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const store = tx.objectStore(IDB_STORE);
    const req = store.getAll();

    req.onsuccess = () => {
      const rows = (req.result as StoredPreviewRecord[]) || [];
      rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

      const grouped: Record<string, ChecklistReferenceImage[]> = {};
      for (const row of rows) {
        const url = URL.createObjectURL(row.blob);
        const item: ChecklistReferenceImage = {
          id: row.id,
          market: row.market,
          stepId: row.stepId,
          fileName: row.fileName,
          mimeType: row.mimeType,
          fileSizeBytes: row.fileSizeBytes,
          storagePath: row.storagePath,
          url,
          createdAt: row.createdAt,
          isLocalPreview: true,
        };
        if (!grouped[row.stepId]) grouped[row.stepId] = [];
        grouped[row.stepId].push(item);
      }
      resolve(grouped);
    };
    req.onerror = () => reject(req.error);
  });
}

async function uploadPreviewReference(
  market: MarketDirection,
  stepId: string,
  file: File
): Promise<ChecklistReferenceImage> {
  const db = await openPreviewDb();
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const safeName = sanitizeFileName(file.name);
  const createdAt = new Date().toISOString();
  const storagePath = `preview-user/${market}/${stepId}/${Date.now()}-${safeName}`;

  const record: StoredPreviewRecord = {
    id,
    market,
    stepId,
    fileName: file.name,
    mimeType: file.type,
    fileSizeBytes: file.size,
    storagePath,
    createdAt,
    blob: file,
  };

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    const store = tx.objectStore(IDB_STORE);
    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });

  return {
    id,
    market,
    stepId,
    fileName: file.name,
    mimeType: file.type,
    fileSizeBytes: file.size,
    storagePath,
    url: URL.createObjectURL(file),
    createdAt,
    isLocalPreview: true,
  };
}

async function deletePreviewReference(id: string): Promise<void> {
  const db = await openPreviewDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    const store = tx.objectStore(IDB_STORE);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ============================================================================
// Unified Public API (Live Supabase Storage when configured, Preview fallback otherwise)
// ============================================================================

export async function fetchAllChecklistReferences(): Promise<{
  byStep: Record<string, ChecklistReferenceImage[]>;
  migrationHint?: string;
}> {
  if (!isSupabaseConfigured()) {
    const byStep = await listPreviewReferences();
    return { byStep };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { byStep: {} };
  }

  const { data: rows, error } = await supabase
    .from("pullback_checklist_images")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    // 42P01 = relation does not exist (migration not applied yet)
    if (error.code === "42P01" || error.message?.includes("pullback_checklist_images")) {
      return {
        byStep: {},
        migrationHint:
          "Run supabase/migrations/20261029000001_pullback_checklist_storage.sql in your Supabase project to initialize the 'pullback-references' bucket and metadata table.",
      };
    }
    throw new Error(error.message);
  }

  if (!rows || rows.length === 0) {
    return { byStep: {} };
  }

  const paths = rows.map((r) => r.storage_path as string);
  const { data: signedData } = await supabase.storage
    .from(PULLBACK_BUCKET)
    .createSignedUrls(paths, 60 * 60 * 6); // 6 hours

  const signedMap = new Map<string, string>();
  signedData?.forEach((entry) => {
    if (entry.path && entry.signedUrl) {
      signedMap.set(entry.path, entry.signedUrl);
    }
  });

  const byStep: Record<string, ChecklistReferenceImage[]> = {};
  for (const row of rows) {
    const url = signedMap.get(row.storage_path) ?? "";
    if (!url) continue;

    const item: ChecklistReferenceImage = {
      id: row.id,
      market: row.market as MarketDirection,
      stepId: row.step_id,
      fileName: row.file_name,
      mimeType: row.mime_type,
      fileSizeBytes: Number(row.file_size_bytes),
      storagePath: row.storage_path,
      url,
      createdAt: row.created_at,
      isLocalPreview: false,
    };

    if (!byStep[item.stepId]) byStep[item.stepId] = [];
    byStep[item.stepId].push(item);
  }

  return { byStep };
}

export async function uploadChecklistReference(
  market: MarketDirection,
  stepId: string,
  file: File
): Promise<ChecklistReferenceImage> {
  const validationError = validateReferenceFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  if (!isSupabaseConfigured()) {
    return uploadPreviewReference(market, stepId, file);
  }

  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("You must be signed in to upload checklist reference images.");
  }

  const safeName = sanitizeFileName(file.name);
  const uniquePrefix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const storagePath = `${user.id}/${market}/${stepId}/${uniquePrefix}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(PULLBACK_BUCKET)
    .upload(storagePath, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data: inserted, error: insertError } = await supabase
    .from("pullback_checklist_images")
    .insert({
      user_id: user.id,
      market,
      step_id: stepId,
      storage_path: storagePath,
      file_name: file.name,
      mime_type: file.type,
      file_size_bytes: file.size,
    })
    .select("*")
    .single();

  if (insertError || !inserted) {
    // Rollback orphaned storage object if metadata insert fails
    await supabase.storage.from(PULLBACK_BUCKET).remove([storagePath]);
    throw new Error(
      insertError?.message ?? "Failed to record uploaded reference image."
    );
  }

  const { data: signed, error: signedError } = await supabase.storage
    .from(PULLBACK_BUCKET)
    .createSignedUrl(storagePath, 60 * 60 * 6);

  if (signedError || !signed?.signedUrl) {
    throw new Error(signedError?.message ?? "Failed to generate image URL.");
  }

  return {
    id: inserted.id,
    market: inserted.market as MarketDirection,
    stepId: inserted.step_id,
    fileName: inserted.file_name,
    mimeType: inserted.mime_type,
    fileSizeBytes: Number(inserted.file_size_bytes),
    storagePath: inserted.storage_path,
    url: signed.signedUrl,
    createdAt: inserted.created_at,
    isLocalPreview: false,
  };
}

export async function removeChecklistReference(
  image: ChecklistReferenceImage
): Promise<void> {
  if (!isSupabaseConfigured() || image.isLocalPreview) {
    if (image.url.startsWith("blob:")) {
      URL.revokeObjectURL(image.url);
    }
    await deletePreviewReference(image.id);
    return;
  }

  const supabase = createClient();

  const { error: storageError } = await supabase.storage
    .from(PULLBACK_BUCKET)
    .remove([image.storagePath]);

  if (storageError) {
    throw new Error(storageError.message);
  }

  const { error: dbError } = await supabase
    .from("pullback_checklist_images")
    .delete()
    .eq("id", image.id);

  if (dbError) {
    throw new Error(dbError.message);
  }
}
