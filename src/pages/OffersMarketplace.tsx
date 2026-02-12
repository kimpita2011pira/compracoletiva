import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOffers } from "@/hooks/useOffers";
import type { OfferWithVendor } from "@/hooks/useOffers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  LogOut,
  Clock,
  ShoppingBag,
  Truck,
  MapPin,
  Flame,
  Tag,
  Store,
} from "lucide-react";

export default function OffersMarketplace() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: offers, isLoading } = useOffers();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-display text-xl font-bold text-primary">
              🔥 Ofertas Ativas
            </h1>
          </div>
          {user && (
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {user.email}
              </span>
              <Button variant="ghost" size="icon" onClick={signOut}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="container py-8">
        {/* Hero */}
        <div className="mb-8 text-center">
          <h2 className="font-display text-3xl font-bold md:text-4xl">
            Economize com{" "}
            <span className="text-primary">compra coletiva</span>
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-muted-foreground">
            Quanto mais gente compra, maior o desconto! Reserve agora e
            economize.
          </p>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && (!offers || offers.length === 0) && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 py-20">
            <ShoppingBag className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="font-display text-lg font-bold text-muted-foreground">
              Nenhuma oferta ativa no momento
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Volte em breve para novas ofertas incríveis!
            </p>
          </div>
        )}

        {/* Offers Grid */}
        {offers && offers.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {offers.map((offer) => (
              <OfferCard key={offer.id} offer={offer} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function OfferCard({ offer }: { offer: OfferWithVendor }) {
  const discount = Math.round(
    ((offer.original_price - offer.offer_price) / offer.original_price) * 100
  );
  const progress = Math.min(
    (offer.sold_quantity / offer.min_quantity) * 100,
    100
  );
  const remaining = Math.max(offer.min_quantity - offer.sold_quantity, 0);
  const endDate = new Date(offer.end_date);
  const now = new Date();
  const hoursLeft = Math.max(
    Math.round((endDate.getTime() - now.getTime()) / (1000 * 60 * 60)),
    0
  );
  const isAlmostDone = hoursLeft <= 24;
  const isGoalReached = offer.sold_quantity >= offer.min_quantity;

  return (
    <div className="group relative overflow-hidden rounded-2xl border bg-card shadow-sm transition-all hover:shadow-lg hover:-translate-y-1">
      {/* Image area */}
      <div className="relative h-44 bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10">
        {offer.image_url ? (
          <img
            src={offer.image_url}
            alt={offer.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ShoppingBag className="h-16 w-16 text-primary/20" />
          </div>
        )}

        {/* Discount badge */}
        <Badge className="absolute left-3 top-3 gap-1 bg-accent text-accent-foreground shadow-md text-sm px-2.5 py-1">
          <Tag className="h-3.5 w-3.5" />-{discount}%
        </Badge>

        {/* Urgency badge */}
        {isAlmostDone && !isGoalReached && (
          <Badge
            variant="outline"
            className="absolute right-3 top-3 gap-1 border-destructive/50 bg-destructive/90 text-destructive-foreground text-xs"
          >
            <Flame className="h-3 w-3" /> Últimas horas!
          </Badge>
        )}

        {isGoalReached && (
          <Badge className="absolute right-3 top-3 gap-1 bg-success text-success-foreground text-xs">
            ✅ Meta atingida!
          </Badge>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Vendor name */}
        {offer.vendors?.company_name && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Store className="h-3 w-3" />
            {offer.vendors.company_name}
          </div>
        )}

        {/* Title */}
        <h3 className="font-display text-lg font-bold leading-tight line-clamp-2">
          {offer.title}
        </h3>

        {/* Prices */}
        <div className="flex items-baseline gap-2">
          <span className="font-display text-2xl font-bold text-primary">
            R$ {offer.offer_price.toFixed(2).replace(".", ",")}
          </span>
          <span className="text-sm text-muted-foreground line-through">
            R$ {offer.original_price.toFixed(2).replace(".", ",")}
          </span>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {offer.sold_quantity}/{offer.min_quantity} reservas
            </span>
            <span
              className={`font-semibold ${isGoalReached ? "text-success" : "text-primary"}`}
            >
              {isGoalReached
                ? "Meta atingida!"
                : `Faltam ${remaining}`}
            </span>
          </div>
          <Progress
            value={progress}
            className="h-2.5"
          />
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {hoursLeft > 48
              ? `${Math.round(hoursLeft / 24)}d restantes`
              : hoursLeft > 0
                ? `${hoursLeft}h restantes`
                : "Encerrada"}
          </div>
          <div className="flex gap-2">
            {offer.pickup_available && (
              <span className="flex items-center gap-0.5">
                <MapPin className="h-3 w-3" /> Retirada
              </span>
            )}
            {offer.delivery_available && (
              <span className="flex items-center gap-0.5">
                <Truck className="h-3 w-3" /> Entrega
              </span>
            )}
          </div>
        </div>

        {/* CTA Button */}
        <Button className="w-full gap-2 font-bold" size="lg">
          <ShoppingBag className="h-4 w-4" /> Reservar Agora
        </Button>
      </div>
    </div>
  );
}
