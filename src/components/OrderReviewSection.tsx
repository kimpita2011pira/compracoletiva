import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useSubmitReview } from "@/hooks/useOfferDetail";
import { useAuth } from "@/hooks/useAuth";

/**
 * Avaliação do comprador para uma oferta já adquirida.
 * Aparece em "Meus Pedidos" — apenas o cliente que comprou vê este formulário.
 */
export function OrderReviewSection({ offerId }: { offerId: string }) {
  const { user } = useAuth();
  const submitReview = useSubmitReview();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [open, setOpen] = useState(false);

  const { data: myReview, refetch } = useQuery({
    queryKey: ["my-review", offerId, user?.id],
    enabled: !!user && !!offerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, rating, comment")
        .eq("offer_id", offerId)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const handleSubmit = async () => {
    if (!rating) {
      toast({ title: "Selecione uma nota", variant: "destructive" });
      return;
    }
    try {
      await submitReview.mutateAsync({ offerId, rating, comment });
      toast({ title: "Avaliação enviada! ⭐" });
      setOpen(false);
      refetch();
    } catch {
      toast({ title: "Erro ao enviar avaliação", variant: "destructive" });
    }
  };

  if (myReview && !open) {
    return (
      <div className="flex items-center gap-2 border-t px-4 py-3">
        <span className="text-xs text-muted-foreground">Sua avaliação:</span>
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star
              key={s}
              className={`h-3.5 w-3.5 ${s <= myReview.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
            />
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto h-7 text-xs"
          onClick={() => {
            setRating(myReview.rating);
            setComment(myReview.comment ?? "");
            setOpen(true);
          }}
        >
          Editar
        </Button>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="border-t px-4 py-3">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
          <Star className="h-4 w-4" /> Avaliar produto
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 border-t px-4 py-3">
      <p className="text-sm font-semibold">Como foi sua experiência?</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            aria-label={`Nota ${s}`}
            onClick={() => setRating(s)}
            className="transition-transform hover:scale-110"
          >
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
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSubmit} disabled={submitReview.isPending || !rating}>
          Enviar avaliação
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
