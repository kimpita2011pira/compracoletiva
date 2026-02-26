import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useOfferDetail, useOfferReviews, useSubmitReview, type Review } from "@/hooks/useOfferDetail";
import { useAuth } from "@/hooks/useAuth";
import ReserveOfferModal from "@/components/ReserveOfferModal";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft, Clock, Flame, MapPin, ShoppingBag, Star, Store, Tag, Truck,
} from "lucide-react";

export default function OfferDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: offer, isLoading } = useOfferDetail(id);
  const { data: reviews } = useOfferReviews(id);
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

        {/* Image */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10">
          {offer.image_url ? (
            <img src={offer.image_url} alt={offer.title} className="h-64 w-full object-cover sm:h-80" />
          ) : (
            <div className="flex h-64 items-center justify-center sm:h-80">
              <ShoppingBag className="h-20 w-20 text-primary/20" />
            </div>
          )}
          <Badge className="absolute left-4 top-4 gap-1 bg-accent text-accent-foreground shadow-md text-sm px-3 py-1.5">
            <Tag className="h-4 w-4" />-{discount}%
          </Badge>
          {isAlmostDone && !isGoalReached && (
            <Badge variant="outline" className="absolute right-4 top-4 gap-1 border-destructive/50 bg-destructive/90 text-destructive-foreground">
              <Flame className="h-3.5 w-3.5" /> Últimas horas!
            </Badge>
          )}
          {isGoalReached && (
            <Badge className="absolute right-4 top-4 gap-1 bg-success text-success-foreground">
              ✅ Meta atingida!
            </Badge>
          )}
        </div>

        {/* Info */}
        <div className="space-y-4">
          {offer.vendors?.company_name && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Store className="h-4 w-4" />
              {offer.vendors.company_name}
            </div>
          )}

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

          <Button className="w-full gap-2 font-bold" size="lg" onClick={() => setShowReserve(true)}>
            <ShoppingBag className="h-5 w-5" /> Reservar Agora
          </Button>
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
