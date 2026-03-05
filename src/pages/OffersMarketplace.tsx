import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useOffers } from "@/hooks/useOffers";
import type { OfferWithVendor } from "@/hooks/useOffers";
import ReserveOfferModal from "@/components/ReserveOfferModal";
import { FavoriteButton } from "@/components/FavoriteButton";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Clock,
  ShoppingBag,
  Truck,
  MapPin,
  Flame,
  Tag,
  Store,
  Search,
  SlidersHorizontal,
  X,
  UtensilsCrossed,
  Sparkles,
  Cpu,
  Shirt,
  Home,
  HeartPulse,
  Wrench,
  Package,
  Share2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SortOption = "ending_soon" | "biggest_discount" | "lowest_price" | "most_popular";
type DeliveryFilter = "all" | "delivery" | "pickup";

const CATEGORY_MAP: Record<string, { label: string; icon: React.ElementType }> = {
  ALIMENTACAO: { label: "Alimentação", icon: UtensilsCrossed },
  BELEZA: { label: "Beleza", icon: Sparkles },
  ELETRONICOS: { label: "Eletrônicos", icon: Cpu },
  MODA: { label: "Moda", icon: Shirt },
  CASA: { label: "Casa", icon: Home },
  SAUDE: { label: "Saúde", icon: HeartPulse },
  SERVICOS: { label: "Serviços", icon: Wrench },
  OUTROS: { label: "Outros", icon: Package },
};

export { CATEGORY_MAP };

export default function OffersMarketplace() {
  const { data: offers, isLoading } = useOffers();
  const [selectedOffer, setSelectedOffer] = useState<OfferWithVendor | null>(null);

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("ending_soon");
  const [deliveryFilter, setDeliveryFilter] = useState<DeliveryFilter>("all");
  const [onlyGoalReached, setOnlyGoalReached] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    if (!offers) return [];
    let result = [...offers];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (o) =>
          o.title.toLowerCase().includes(q) ||
          o.description?.toLowerCase().includes(q) ||
          o.vendors?.company_name?.toLowerCase().includes(q)
      );
    }

    // Delivery filter
    if (deliveryFilter === "delivery") result = result.filter((o) => o.delivery_available);
    if (deliveryFilter === "pickup") result = result.filter((o) => o.pickup_available);

    // Category filter
    if (categoryFilter !== "all") result = result.filter((o) => o.category === categoryFilter);

    // Goal reached
    if (onlyGoalReached) result = result.filter((o) => o.sold_quantity >= o.min_quantity);

    // Sort
    result.sort((a, b) => {
      switch (sort) {
        case "ending_soon":
          return new Date(a.end_date).getTime() - new Date(b.end_date).getTime();
        case "biggest_discount": {
          const dA = (a.original_price - a.offer_price) / a.original_price;
          const dB = (b.original_price - b.offer_price) / b.original_price;
          return dB - dA;
        }
        case "lowest_price":
          return a.offer_price - b.offer_price;
        case "most_popular":
          return b.sold_quantity - a.sold_quantity;
        default:
          return 0;
      }
    });

    return result;
  }, [offers, search, sort, deliveryFilter, onlyGoalReached, categoryFilter]);

  const hasActiveFilters = search.trim() || deliveryFilter !== "all" || onlyGoalReached || sort !== "ending_soon" || categoryFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setSort("ending_soon");
    setDeliveryFilter("all");
    setOnlyGoalReached(false);
    setCategoryFilter("all");
  };

  return (
    <AppLayout title="🔥 Ofertas Ativas">
      <main className="container py-8">
        {/* Hero */}
        <div className="mb-8 text-center">
          <h2 className="font-display text-3xl font-bold md:text-4xl">
            Economize com{" "}
            <span className="text-primary">compra coletiva</span>
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-muted-foreground">
            Quanto mais gente compra, maior o desconto! Reserve agora e economize.
          </p>
        </div>

        {/* Search & Filters */}
        <div className="mb-6 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar ofertas, produtos ou lojas..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button
              variant={showFilters ? "default" : "outline"}
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className="shrink-0"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </div>

          {/* Category chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            <Button
              variant={categoryFilter === "all" ? "default" : "outline"}
              size="sm"
              className="text-xs shrink-0 gap-1.5"
              onClick={() => setCategoryFilter("all")}
            >
              Todas
            </Button>
            {Object.entries(CATEGORY_MAP).map(([key, { label, icon: Icon }]) => (
              <Button
                key={key}
                variant={categoryFilter === key ? "default" : "outline"}
                size="sm"
                className="text-xs shrink-0 gap-1.5"
                onClick={() => setCategoryFilter(key)}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Button>
            ))}
          </div>

          {showFilters && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3 animate-fade-in">
              <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
                <SelectTrigger className="w-[170px] text-xs">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ending_soon">Encerrando em breve</SelectItem>
                  <SelectItem value="biggest_discount">Maior desconto</SelectItem>
                  <SelectItem value="lowest_price">Menor preço</SelectItem>
                  <SelectItem value="most_popular">Mais reservados</SelectItem>
                </SelectContent>
              </Select>

              <Select value={deliveryFilter} onValueChange={(v) => setDeliveryFilter(v as DeliveryFilter)}>
                <SelectTrigger className="w-[140px] text-xs">
                  <SelectValue placeholder="Entrega" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="delivery">Com entrega</SelectItem>
                  <SelectItem value="pickup">Com retirada</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant={onlyGoalReached ? "default" : "outline"}
                size="sm"
                className="text-xs gap-1"
                onClick={() => setOnlyGoalReached(!onlyGoalReached)}
              >
                ✅ Meta atingida
              </Button>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1" onClick={clearFilters}>
                  <X className="h-3 w-3" /> Limpar filtros
                </Button>
              )}
            </div>
          )}

          {/* Results count */}
          {!isLoading && offers && (
            <p className="text-xs text-muted-foreground">
              {filtered.length === offers.length
                ? `${offers.length} oferta${offers.length !== 1 ? "s" : ""} ativa${offers.length !== 1 ? "s" : ""}`
                : `${filtered.length} de ${offers.length} oferta${offers.length !== 1 ? "s" : ""}`}
            </p>
          )}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 py-20">
            <ShoppingBag className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="font-display text-lg font-bold text-muted-foreground">
              {offers && offers.length > 0
                ? "Nenhuma oferta encontrada com esses filtros"
                : "Nenhuma oferta ativa no momento"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {offers && offers.length > 0
                ? "Tente alterar os filtros ou a busca"
                : "Volte em breve para novas ofertas incríveis!"}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>
                Limpar filtros
              </Button>
            )}
          </div>
        )}

        {/* Offers Grid */}
        {filtered.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((offer) => (
              <OfferCard key={offer.id} offer={offer} onReserve={setSelectedOffer} />
            ))}
          </div>
        )}

        {selectedOffer && (
          <ReserveOfferModal
            offer={selectedOffer}
            open={!!selectedOffer}
            onOpenChange={(open) => !open && setSelectedOffer(null)}
          />
        )}
      </main>
    </AppLayout>
  );
}

function OfferCard({ offer, onReserve }: { offer: OfferWithVendor; onReserve: (offer: OfferWithVendor) => void }) {
  const navigate = useNavigate();
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

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/offers/${offer.id}`;
    const text = `🔥 ${offer.title} com ${discount}% OFF! De R$ ${offer.original_price.toFixed(2).replace(".", ",")} por R$ ${offer.offer_price.toFixed(2).replace(".", ",")}. Confira:`;
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, "_blank");
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl border bg-card shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer" onClick={() => navigate(`/offers/${offer.id}`)}>
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

        <Badge className="absolute left-3 top-3 gap-1 bg-accent text-accent-foreground shadow-md text-sm px-2.5 py-1">
          <Tag className="h-3.5 w-3.5" />-{discount}%
        </Badge>

        <FavoriteButton offerId={offer.id} className="absolute right-12 bottom-3 z-10" />
        <button
          onClick={handleShare}
          className="absolute right-3 bottom-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-card/80 backdrop-blur-sm shadow-md transition-colors hover:bg-card"
          title="Compartilhar"
        >
          <Share2 className="h-4 w-4 text-foreground" />
        </button>

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
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {offer.vendors?.company_name && (
            <>
              <Store className="h-3 w-3" />
              {offer.vendors.company_name}
            </>
          )}
          {offer.category && CATEGORY_MAP[offer.category] && (
            <>
              {offer.vendors?.company_name && <span>·</span>}
              {(() => { const CatIcon = CATEGORY_MAP[offer.category].icon; return <CatIcon className="h-3 w-3" />; })()}
              {CATEGORY_MAP[offer.category].label}
            </>
          )}
        </div>

        <h3 className="font-display text-lg font-bold leading-tight line-clamp-2">
          {offer.title}
        </h3>

        <div className="flex items-baseline gap-2">
          <span className="font-display text-2xl font-bold text-primary">
            R$ {offer.offer_price.toFixed(2).replace(".", ",")}
          </span>
          <span className="text-sm text-muted-foreground line-through">
            R$ {offer.original_price.toFixed(2).replace(".", ",")}
          </span>
        </div>

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
          <Progress value={progress} className="h-2.5" />
        </div>

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

        <Button className="w-full gap-2 font-bold" size="lg" onClick={(e) => { e.stopPropagation(); onReserve(offer); }}>
          <ShoppingBag className="h-4 w-4" /> Reservar Agora
        </Button>
      </div>
    </div>
  );
}
