import { useNavigate } from "react-router-dom";
import { useVendorInterests, type OfferInterestSummary } from "@/hooks/useVendorInterests";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, RefreshCw } from "lucide-react";

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  VALIDADA: { label: "Validada", variant: "default" },
  CANCELADA: { label: "Cancelada", variant: "destructive" },
  ENCERRADA: { label: "Encerrada", variant: "secondary" },
  ATIVA: { label: "Expirada", variant: "outline" },
};

export function VendorInterestsPanel() {
  const { data: interests, isLoading } = useVendorInterests();

  if (isLoading || !interests || interests.length === 0) return null;

  const hasAnyInterest = interests.some((i) => i.interest_count > 0);
  if (!hasAnyInterest) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-base flex items-center gap-2">
          <Heart className="h-4 w-4 text-primary" />
          Demanda Represada
        </CardTitle>
        <CardDescription>Pessoas interessadas em ofertas encerradas</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {interests
          .filter((i) => i.interest_count > 0)
          .map((item) => (
            <InterestRow key={item.offer_id} item={item} />
          ))}
      </CardContent>
    </Card>
  );
}

function InterestRow({ item }: { item: OfferInterestSummary }) {
  const navigate = useNavigate();
  const cfg = statusLabels[item.status] ?? statusLabels.ENCERRADA;

  const handleRecreate = () => {
    navigate("/vendor/create-offer", {
      state: {
        cloneFrom: {
          title: item.title,
          description: item.description,
          category: item.category,
          original_price: item.original_price,
          offer_price: item.offer_price,
          min_quantity: item.min_quantity,
          max_per_user: item.max_per_user,
          delivery_available: item.delivery_available,
          delivery_fee: item.delivery_fee,
          pickup_available: item.pickup_available,
          estimated_delivery_time: item.estimated_delivery_time,
          city: item.city,
          image_url: item.image_url,
        },
      },
    });
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{item.title}</p>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant={cfg.variant} className="text-[10px] px-1.5 py-0">
            {cfg.label}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {new Date(item.end_date).toLocaleDateString("pt-BR")}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-1.5">
          <Heart className="h-4 w-4 fill-primary text-primary" />
          <span className="text-lg font-bold text-primary">{item.interest_count}</span>
        </div>
        <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={handleRecreate}>
          <RefreshCw className="h-3.5 w-3.5" />
          Recriar
        </Button>
      </div>
    </div>
  );
}
