import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useOfferDetail, useOfferReviews, useSubmitReview, type Review } from "@/hooks/useOfferDetail";
import { useOfferImages } from "@/hooks/useOfferImages";
import { useAuth } from "@/hooks/useAuth";
import ReserveOfferModal from "@/components/ReserveOfferModal";
import { OfferImageGallery } from "@/components/OfferImageGallery";
import { FavoriteButton } from "@/components/FavoriteButton";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft, Clock, Flame, Link2, MapPin, ShoppingBag, Star, Store, Tag, Truck,
} from "lucide-react";
import { CATEGORY_MAP } from "./OffersMarketplace";

export default function OfferDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: offer, isLoading } = useOfferDetail(id);
  const { data: reviews } = useOfferReviews(id);
  const { data: galleryImages } = useOfferImages(id);
  const submitReview = useSubmitReview();
  const [showReserve, setShowReserve] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  if (isLoading) {
    return (
      <AppLayout title="Carregando...">
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  if (!offer) {
    return (
      <AppLayout title="Oferta não encontrada">
        <div className="flex flex-col items-center py-20 text-center">
          <ShoppingBag className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <p className="font-display text-lg font-bold text-muted-foreground">Oferta não encontrada</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/offers")}>
            Voltar às ofertas
          </Button>
        </div>
      </AppLayout>
    );
  }

  const discount = Math.round(((offer.original_price - offer.offer_price) / offer.original_price) * 100);
  const progress = Math.min((offer.sold_quantity / offer.min_quantity) * 100, 100);
  const remaining = Math.max(offer.min_quantity - offer.sold_quantity, 0);
  const endDate = new Date(offer.end_date);
  const hoursLeft = Math.max(Math.round((endDate.getTime() - Date.now()) / (1000 * 60 * 60)), 0);
  const isGoalReached = offer.sold_quantity >= offer.min_quantity;
  const isAlmostDone = hoursLeft <= 24;
  const avgRating = reviews && reviews.length > 0
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;

  const shareUrl = `${window.location.origin}/offers/${offer.id}`;
  const shareText = `🔥 ${offer.title} com ${discount}% de desconto! De R$ ${offer.original_price.toFixed(2).replace(".", ",")} por R$ ${offer.offer_price.toFixed(2).replace(".", ",")}. Confira:`;

  const handleShareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`, "_blank");
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: "Link copiado! 📋" });
    } catch {
      toast({ title: "Erro ao copiar link", variant: "destructive" });
    }
  };

  const handleSubmitReview = async () => {
    if (!rating) { toast({ title: "Selecione uma nota", variant: "destructive" }); return; }
    try {
      await submitReview.mutateAsync({ offerId: offer.id, rating, comment });
      toast({ title: "Avaliação enviada! ⭐" });
      setRating(0);
      setComment("");
    } catch {
      toast({ title: "Erro ao enviar avaliação", variant: "destructive" });
    }
  };

  return (
    <AppLayout title={offer.title}>
      <main className="container max-w-3xl py-6 space-y-6">
        {/* Back */}
        <Button variant="ghost" size="sm" className="gap-1" onClick={() => navigate("/offers")}>
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>

        {/* Image Gallery */}
        <div className="relative">
          <OfferImageGallery
            mainImage={offer.image_url}
            galleryImages={galleryImages ?? []}
            title={offer.title}
          />
          <Badge className="absolute left-4 top-4 gap-1 bg-accent text-accent-foreground shadow-md text-sm px-3 py-1.5 z-10">
            <Tag className="h-4 w-4" />-{discount}%
          </Badge>
          {isAlmostDone && !isGoalReached && (
            <Badge variant="outline" className="absolute right-4 top-4 gap-1 border-destructive/50 bg-destructive/90 text-destructive-foreground z-10">
              <Flame className="h-3.5 w-3.5" /> Últimas horas!
            </Badge>
          )}
          {isGoalReached && (
            <Badge className="absolute right-4 top-4 gap-1 bg-success text-success-foreground z-10">
              ✅ Meta atingida!
            </Badge>
          )}
        </div>

        {/* Info */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {offer.vendors?.company_name && (
              <>
                <Store className="h-4 w-4" />
                {offer.vendors.company_name}
              </>
            )}
            {offer.category && CATEGORY_MAP[offer.category] && (
              <>
                {offer.vendors?.company_name && <span>·</span>}
                {(() => { const CatIcon = CATEGORY_MAP[offer.category].icon; return <CatIcon className="h-4 w-4" />; })()}
                {CATEGORY_MAP[offer.category].label}
              </>
            )}
            {(offer as any).city && (
              <>
                {(offer.vendors?.company_name || (offer.category && CATEGORY_MAP[offer.category])) && <span>·</span>}
                <MapPin className="h-4 w-4" />
                {(offer as any).city}
              </>
            )}
          </div>

          <h1 className="font-display text-2xl font-bold sm:text-3xl">{offer.title}</h1>

          {reviews && reviews.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className={`h-4 w-4 ${s <= Math.round(avgRating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                ))}
              </div>
              <span className="font-semibold">{avgRating.toFixed(1)}</span>
              <span className="text-muted-foreground">({reviews.length} avaliação{reviews.length !== 1 ? "ões" : ""})</span>
            </div>
          )}

          <div className="flex items-baseline gap-3">
            <span className="font-display text-3xl font-bold text-primary">
              R$ {offer.offer_price.toFixed(2).replace(".", ",")}
            </span>
            <span className="text-lg text-muted-foreground line-through">
              R$ {offer.original_price.toFixed(2).replace(".", ",")}
            </span>
          </div>

          {offer.description && (
            <p className="text-muted-foreground leading-relaxed">{offer.description}</p>
          )}

          {/* Progress */}
          <div className="rounded-xl border bg-card p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{offer.sold_quantity}/{offer.min_quantity} reservas</span>
              <span className={`font-semibold ${isGoalReached ? "text-success" : "text-primary"}`}>
                {isGoalReached ? "Meta atingida!" : `Faltam ${remaining}`}
              </span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>

          {/* Details chips */}
          <div className="flex flex-wrap gap-2 text-sm">
            <div className="flex items-center gap-1.5 rounded-full border px-3 py-1.5">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              {hoursLeft > 48 ? `${Math.round(hoursLeft / 24)}d restantes` : hoursLeft > 0 ? `${hoursLeft}h restantes` : "Encerrada"}
            </div>
            {offer.pickup_available && (
              <div className="flex items-center gap-1.5 rounded-full border px-3 py-1.5">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" /> Retirada
              </div>
            )}
            {offer.delivery_available && (
              <div className="flex items-center gap-1.5 rounded-full border px-3 py-1.5">
                <Truck className="h-3.5 w-3.5 text-muted-foreground" /> Entrega
                {offer.delivery_fee ? ` +R$ ${Number(offer.delivery_fee).toFixed(2).replace(".", ",")}` : ""}
              </div>
            )}
            {offer.estimated_delivery_time && (
              <div className="flex items-center gap-1.5 rounded-full border px-3 py-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" /> {offer.estimated_delivery_time}
              </div>
            )}
            {offer.max_per_user && (
              <div className="flex items-center gap-1.5 rounded-full border px-3 py-1.5">
                Máx {offer.max_per_user} por pessoa
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button className="flex-1 gap-2 font-bold" size="lg" onClick={() => setShowReserve(true)}>
              <ShoppingBag className="h-5 w-5" /> Reservar Agora
            </Button>
            <FavoriteButton offerId={offer.id} size="md" />
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11 shrink-0"
              onClick={handleShareWhatsApp}
              title="Compartilhar via WhatsApp"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-[#25D366]">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11 shrink-0"
              onClick={handleCopyLink}
              title="Copiar link"
            >
              <Link2 className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Reviews Section */}
        <section className="space-y-4 border-t pt-6">
          <h2 className="font-display text-xl font-bold">Avaliações</h2>

          {/* Submit review form */}
          {user && (
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <p className="text-sm font-semibold">Deixe sua avaliação</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} onClick={() => setRating(s)} className="transition-transform hover:scale-110">
                    <Star className={`h-6 w-6 ${s <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                  </button>
                ))}
              </div>
              <Textarea
                placeholder="Comentário (opcional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
              />
              <Button size="sm" onClick={handleSubmitReview} disabled={submitReview.isPending || !rating}>
                Enviar avaliação
              </Button>
            </div>
          )}

          {/* Reviews list */}
          {reviews && reviews.length > 0 ? (
            <div className="space-y-3">
              {reviews.map((r) => (
                <ReviewCard key={r.id} review={r} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma avaliação ainda. Seja o primeiro!</p>
          )}
        </section>

        {showReserve && (
          <ReserveOfferModal
            offer={offer}
            open={showReserve}
            onOpenChange={(o) => !o && setShowReserve(false)}
          />
        )}
      </main>
    </AppLayout>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="flex gap-3 rounded-xl border bg-card p-4">
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarImage src={review.profiles?.avatar_url ?? undefined} />
        <AvatarFallback>{(review.profiles?.name ?? "U")[0]}</AvatarFallback>
      </Avatar>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{review.profiles?.name ?? "Usuário"}</span>
          <div className="flex">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} className={`h-3.5 w-3.5 ${s <= review.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
            ))}
          </div>
        </div>
        {review.comment && <p className="text-sm text-muted-foreground">{review.comment}</p>}
        <p className="text-xs text-muted-foreground/60">
          {new Date(review.created_at).toLocaleDateString("pt-BR")}
        </p>
      </div>
    </div>
  );
}
