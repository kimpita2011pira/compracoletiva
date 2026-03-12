import { useState, useEffect } from "react";
import { usePromoBanners } from "@/hooks/usePromoBanners";

export function PromoBanner() {
  const { banners, isLoading } = usePromoBanners(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [banners.length]);

  if (isLoading || banners.length === 0) return null;

  const safeIndex = currentIndex % banners.length;

  return (
    <div className="relative overflow-hidden bg-primary text-primary-foreground">
      <div className="container flex h-16 items-center justify-center text-sm font-medium">
        <div key={banners[safeIndex].id} className="animate-marquee whitespace-nowrap">
          {banners[safeIndex].message}
        </div>
      </div>
    </div>
  );
}
