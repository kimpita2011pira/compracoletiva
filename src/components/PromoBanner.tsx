import { useState, useEffect, createContext, useContext } from "react";
import { X } from "lucide-react";
import { usePromoBanners } from "@/hooks/usePromoBanners";

const BannerVisibleContext = createContext(true);
export const useBannerVisible = () => useContext(BannerVisibleContext);

export function PromoBanner() {
  const { banners, isLoading } = usePromoBanners(true);
  const [visible, setVisible] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [banners.length]);

  if (!visible || isLoading || banners.length === 0) return null;

  const safeIndex = currentIndex % banners.length;

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-[60] overflow-hidden bg-primary text-primary-foreground">
        <div className="container flex h-8 items-center justify-center text-sm font-medium">
          <div key={banners[safeIndex].id} className="animate-marquee whitespace-nowrap">
            {banners[safeIndex].message}
          </div>
        </div>
        <button
          onClick={() => setVisible(false)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 hover:bg-primary-foreground/20 transition-colors"
          aria-label="Fechar banner"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="h-8 shrink-0" />
    </>
  );
}
