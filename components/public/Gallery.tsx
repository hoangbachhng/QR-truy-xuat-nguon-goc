"use client";

import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";

export interface GalleryImage {
  src: string;
  caption?: string;
}

// Ảnh/sơ đồ minh họa: bấm để phóng to, vuốt/nút để chuyển ảnh.
export function Gallery({ images, size = "md" }: { images: GalleryImage[]; size?: "sm" | "md" }) {
  const [open, setOpen] = useState<number | null>(null);
  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((i) => (i === null ? i : (i + 1) % images.length));
      if (e.key === "ArrowLeft") setOpen((i) => (i === null ? i : (i - 1 + images.length) % images.length));
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, images.length]);

  if (!images.length) return null;
  const single = images.length === 1 && size === "md";
  return (
    <>
      <div className={single ? "mt-3" : "mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3"}>
        {images.map((im, i) => (
          <button
            key={im.src + i}
            type="button"
            onClick={() => setOpen(i)}
            className="group relative block w-full overflow-hidden rounded-lg border border-line bg-white text-left"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={im.src}
              alt={im.caption || "Hình minh họa"}
              loading="lazy"
              className={single ? "w-full object-contain" : "aspect-[4/3] w-full object-cover"}
            />
            <span className="absolute right-1.5 top-1.5 rounded-full bg-black/45 p-1 text-white opacity-80 group-hover:opacity-100">
              <ZoomIn size={14} />
            </span>
            {im.caption && <span className="block border-t border-line px-2 py-1 text-xs text-stone">{im.caption}</span>}
          </button>
        ))}
      </div>
      {open !== null && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/90"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(null)}
        >
          <div className="flex items-center justify-between p-3 text-sm text-white">
            <span>
              {open + 1}/{images.length} {images[open].caption && `· ${images[open].caption}`}
            </span>
            <button type="button" aria-label="Đóng" className="rounded-full bg-white/15 p-2">
              <X size={18} />
            </button>
          </div>
          <div className="relative flex flex-1 items-center justify-center overflow-auto p-2" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={images[open].src} alt={images[open].caption || ""} className="max-h-full max-w-full rounded bg-white object-contain" />
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Ảnh trước"
                  onClick={() => setOpen((open - 1 + images.length) % images.length)}
                  className="absolute left-2 rounded-full bg-white/20 p-2 text-white"
                >
                  <ChevronLeft />
                </button>
                <button
                  type="button"
                  aria-label="Ảnh sau"
                  onClick={() => setOpen((open + 1) % images.length)}
                  className="absolute right-2 rounded-full bg-white/20 p-2 text-white"
                >
                  <ChevronRight />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
