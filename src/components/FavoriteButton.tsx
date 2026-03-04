import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFavorites, useToggleFavorite } from "@/hooks/useFavorites";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  offerId: string;
  size?: "sm" | "md";
  className?: string;
}

export function FavoriteButton({ offerId, size = "sm", className }: FavoriteButtonProps) {
  const { favoriteIds } = useFavorites();
  const toggle = useToggleFavorite();
  const isFavorited = favoriteIds.includes(offerId);

  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const btnSize = size === "sm" ? "h-8 w-8" : "h-10 w-10";

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        btnSize,
        "rounded-full bg-background/80 backdrop-blur-sm hover:bg-background shadow-sm",
        className
      )}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        toggle.mutate({ offerId, isFavorited });
      }}
    >
      <Heart
        className={cn(
          iconSize,
          "transition-all",
          isFavorited
            ? "fill-destructive text-destructive scale-110"
            : "text-muted-foreground hover:text-destructive"
        )}
      />
    </Button>
  );
}
