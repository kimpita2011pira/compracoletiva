import { useState } from "react";
import { ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

interface OfferImageGalleryProps {
  mainImage?: string | null;
  galleryImages: { id: string; image_url: string }[];
  title: string;
  className?: string;
}

export function OfferImageGallery({ mainImage, galleryImages, title, className }: OfferImageGalleryProps) {
  // Combine main image + gallery images, deduplicating
  const allImages: string[] = [];
  if (mainImage) allImages.push(mainImage);
  for (const img of galleryImages) {
    if (!allImages.includes(img.image_url)) {
      allImages.push(img.image_url);
    }
  }

  const [activeIndex, setActiveIndex] = useState(0);

  if (allImages.length === 0) {
    return (
      <div className={cn("flex h-64 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 sm:h-80", className)}>
        <ShoppingBag className="h-20 w-20 text-primary/20" />
      </div>
    );
  }

  if (allImages.length === 1) {
    return (
      <div className={cn("overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10", className)}>
        <img src={allImages[0]} alt={title} className="h-64 w-full object-cover sm:h-80" />
      </div>
    );
  }

  const prev = () => setActiveIndex((i) => (i - 1 + allImages.length) % allImages.length);
  const next = () => setActiveIndex((i) => (i + 1) % allImages.length);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Main image with arrows */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10">
        <img
          src={allImages[activeIndex]}
          alt={`${title} - ${activeIndex + 1}`}
          className="h-64 w-full object-cover sm:h-80 transition-opacity duration-200"
        />
        <button
          onClick={prev}
          className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-1.5 shadow-md hover:bg-background transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={next}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-1.5 shadow-md hover:bg-background transition-colors"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {allImages.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={cn(
                "h-2 w-2 rounded-full transition-all",
                i === activeIndex ? "bg-primary w-4" : "bg-background/60"
              )}
            />
          ))}
        </div>
      </div>

      {/* Thumbnails */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {allImages.map((url, i) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            className={cn(
              "shrink-0 h-16 w-16 rounded-lg overflow-hidden border-2 transition-all",
              i === activeIndex ? "border-primary ring-2 ring-primary/20" : "border-transparent opacity-60 hover:opacity-100"
            )}
          >
            <img src={url} alt={`Thumb ${i + 1}`} className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}
