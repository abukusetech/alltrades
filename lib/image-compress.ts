export interface CompressOptions {
  maxDimension?: number;
  quality?: number;
  mimeType?: "image/jpeg" | "image/webp";
}

export interface CompressResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  ratio: number;
}

export async function compressImage(
  file: File,
  opts: CompressOptions = {}
): Promise<CompressResult> {
  const originalSize = file.size;
  const maxDimension = opts.maxDimension ?? 1600;
  const quality = opts.quality ?? 0.78;
  const mimeType = opts.mimeType ?? "image/jpeg";

  if (
    !file.type.startsWith("image/") ||
    file.type === "image/svg+xml" ||
    file.type === "image/gif"
  ) {
    return { file, originalSize, compressedSize: originalSize, ratio: 1 };
  }

  try {
    const bitmap = await loadBitmap(file);
    const { width, height } = scaleToFit(bitmap.width, bitmap.height, maxDimension);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D not available");

    if (mimeType === "image/jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
    }
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, mimeType, quality)
    );
    if (!blob) throw new Error("Canvas.toBlob returned null");

    if (blob.size >= originalSize) {
      return { file, originalSize, compressedSize: originalSize, ratio: 1 };
    }

    const ext = mimeType === "image/webp" ? "webp" : "jpg";
    const baseName = file.name.replace(/\.[^.]+$/, "");
    const newFile = new File([blob], `${baseName}.${ext}`, {
      type: mimeType,
      lastModified: Date.now(),
    });

    return {
      file: newFile,
      originalSize,
      compressedSize: blob.size,
      ratio: blob.size / originalSize,
    };
  } catch {
    return { file, originalSize, compressedSize: originalSize, ratio: 1 };
  }
}

function scaleToFit(w: number, h: number, maxDimension: number) {
  if (w <= maxDimension && h <= maxDimension) return { width: w, height: h };
  const ratio = Math.min(maxDimension / w, maxDimension / h);
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) };
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      // fall through
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Image load failed"));
      i.src = url;
    });
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
