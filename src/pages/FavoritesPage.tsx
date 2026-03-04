import { useNavigate } from "react-router-dom";
import { useFavorites } from "@/hooks/useFavorites";
import { useOffers } from "@/hooks/useOffers";
import { AppLayout } from "@/components/AppLayout";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Heart, ShoppingBag, Tag, Store, Clock } from "lucide-react";

export default function FavoritesPage() {
  const navigate = useNavigate();
  const { favoriteIds, isLoading: loadingFavs } = useFavorites();
  const { data: allOffers, isLoading: loadingOffers } = useOffers();

  const isLoading = loadingFavs || loadingOffers;
  const favorites = (allOffers ?? []).filter((o) => favoriteIds.includes(o.id));

  return (
    <AppLayout title="❤️ Favoritos">
      <main className="container max-w-3xl py-8 space-y-6">
        <h2 className="font-display text-2xl font-bold">Meus Favoritos</h2>

        {isLoading && (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        )}

        {!isLoading && favorites.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 py-20">
            <Heart className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="font-display text-lg font-bold text-muted-foreground">
              Nenhuma oferta salva
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Toque no ❤️ nas ofertas para salvá-las aqui
            </p>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/offers")}>
              Ver ofertas
            </Button>
          </div>
        )}

        {favorites.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {favorites.map((offer) => {
              const discount = Math.round(((offer.original_price - offer.offer_price) / offer.original_price) * 100);
              const progress = Math.min((offer.sold_quantity / offer.min_quantity) * 100, 100);
              const endDate = new Date(offer.end_date);
              const hoursLeft = Math.max(Math.round((endDate.getTime() - Date.now()) / (1000 * 60 * 60)), 0);

              return (
                <div
                  key={offer.id}
                  className="group relative overflow-hidden rounded-2xl border bg-card shadow-sm transition-all hover:shadow-lg cursor-pointer"
                  onClick={() => navigate(`/offers/${offer.id}`)}
                >
                  <div className="relative h-36 bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10">
                    {offer.image_url ? (
                      <img src={offer.image_url} alt={offer.title} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <ShoppingBag className="h-12 w-12 text-primary/20" />
                      </div>
                    )}
                    <Badge className="absolute left-3 top-3 gap-1 bg-accent text-accent-foreground shadow-md text-xs px-2 py-0.5">
                      <Tag className="h-3 w-3" />-{discount}%
                    </Badge>
                    <FavoriteButton offerId={offer.id} className="absolute right-3 top-3" />
                  </div>

                  <div className="p-3 space-y-2">
                    {offer.vendors?.company_name && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Store className="h-3 w-3" /> {offer.vendors.company_name}
                      </div>
                    )}
                    <h3 className="font-display text-sm font-bold leading-tight line-clamp-2">{offer.title}</h3>
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-lg font-bold text-primary">
                        R$ {offer.offer_price.toFixed(2).replace(".", ",")}
                      </span>
                      <span className="text-xs text-muted-foreground line-through">
                        R$ {offer.original_price.toFixed(2).replace(".", ",")}
                      </span>
                    </div>
                    <Progress value={progress} className="h-1.5" />
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {hoursLeft > 48 ? `${Math.round(hoursLeft / 24)}d restantes` : hoursLeft > 0 ? `${hoursLeft}h restantes` : "Encerrada"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </AppLayout>
  );
}
