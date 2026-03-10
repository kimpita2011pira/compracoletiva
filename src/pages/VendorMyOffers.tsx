import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useVendorOffers, useCancelOffer } from "@/hooks/useVendorOffers";
import { useVendor } from "@/hooks/useVendor";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft, Plus, ShoppingBag, Clock, CheckCircle, XCircle, Ban,
  Eye, MoreVertical, Pencil,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CATEGORY_MAP } from "./OffersMarketplace";
import type { VendorOffer } from "@/hooks/useVendorOffers";
import { useState } from "react";

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  ATIVA: { label: "Ativa", icon: Clock, variant: "default" },
  VALIDADA: { label: "Validada", icon: CheckCircle, variant: "secondary" },
  CANCELADA: { label: "Cancelada", icon: XCircle, variant: "destructive" },
  ENCERRADA: { label: "Encerrada", icon: Ban, variant: "outline" },
};

export default function VendorMyOffers() {
  const navigate = useNavigate();
  const { vendor, isLoading: vendorLoading } = useVendor();
  const { offers, isLoading } = useVendorOffers();
  const cancelOffer = useCancelOffer();
  const [cancelId, setCancelId] = useState<string | null>(null);

  useEffect(() => {
    if (!vendorLoading && vendor && vendor.status !== "APROVADO") {
      navigate("/vendor", { replace: true });
    }
  }, [vendor, vendorLoading, navigate]);

  if (vendorLoading) {
    return (
      <AppLayout title="📦 Minhas Ofertas">
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  if (!vendor || vendor.status !== "APROVADO") {
    return null;
  }

  const handleCancel = async (id: string) => {
    try {
      await cancelOffer.mutateAsync(id);
      toast({ title: "Oferta cancelada" });
      setCancelId(null);
    } catch {
      toast({ title: "Erro ao cancelar oferta", variant: "destructive" });
    }
  };

  return (
    <AppLayout title="📦 Minhas Ofertas">
      <main className="container max-w-3xl py-6 space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" className="gap-1" onClick={() => navigate("/vendor")}>
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <Button size="sm" className="gap-1" onClick={() => navigate("/vendor/create-offer")}>
            <Plus className="h-4 w-4" /> Nova Oferta
          </Button>
        </div>

        {isLoading && (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        )}

        {!isLoading && offers.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 py-20">
            <ShoppingBag className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="font-display text-lg font-bold text-muted-foreground">Nenhuma oferta criada</p>
            <p className="mt-1 text-sm text-muted-foreground">Crie sua primeira oferta coletiva!</p>
            <Button className="mt-4 gap-1" onClick={() => navigate("/vendor/create-offer")}>
              <Plus className="h-4 w-4" /> Criar Oferta
            </Button>
          </div>
        )}

        {offers.length > 0 && (
          <div className="space-y-4">
            {offers.map((offer) => (
              <OfferRow
                key={offer.id}
                offer={offer}
                onView={() => navigate(`/offers/${offer.id}`)}
                onEdit={() => navigate(`/vendor/edit-offer/${offer.id}`)}
                onCancel={() => setCancelId(offer.id)}
              />
            ))}
          </div>
        )}

        {/* Cancel confirmation dialog */}
        <AlertDialog open={!!cancelId} onOpenChange={(open) => !open && setCancelId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancelar oferta?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Os clientes que reservaram serão notificados e os valores estornados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Não, manter</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => cancelId && handleCancel(cancelId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Sim, cancelar oferta
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </AppLayout>
  );
}

function OfferRow({
  offer,
  onView,
  onEdit,
  onCancel,
}: {
  offer: VendorOffer;
  onView: () => void;
  onEdit: () => void;
  onCancel: () => void;
}) {
  const statusCfg = STATUS_CONFIG[offer.status] ?? STATUS_CONFIG.ATIVA;
  const StatusIcon = statusCfg.icon;
  const progress = Math.min((offer.sold_quantity / offer.min_quantity) * 100, 100);
  const isGoalReached = offer.sold_quantity >= offer.min_quantity;
  const endDate = new Date(offer.end_date);
  const isExpired = endDate < new Date();
  const category = offer.category ? CATEGORY_MAP[offer.category] : null;

  return (
    <Card className="transition-all hover:shadow-md">
      <CardContent className="flex items-start gap-4 p-4">
        {/* Image thumbnail */}
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10">
          {offer.image_url ? (
            <img src={offer.image_url} alt={offer.title} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <ShoppingBag className="h-8 w-8 text-primary/20" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-display font-bold text-sm leading-tight line-clamp-1">{offer.title}</h3>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <Badge variant={statusCfg.variant} className="text-xs gap-1">
                  <StatusIcon className="h-3 w-3" />
                  {statusCfg.label}
                </Badge>
                {category && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    {(() => { const CatIcon = category.icon; return <CatIcon className="h-3 w-3" />; })()}
                    {category.label}
                  </span>
                )}
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onView} className="gap-2">
                  <Eye className="h-4 w-4" /> Ver oferta
                </DropdownMenuItem>
                {offer.status === "ATIVA" && (
                  <DropdownMenuItem onClick={onEdit} className="gap-2">
                    <Pencil className="h-4 w-4" /> Editar oferta
                  </DropdownMenuItem>
                )}
                {offer.status === "ATIVA" && (
                  <DropdownMenuItem onClick={onCancel} className="gap-2 text-destructive focus:text-destructive">
                    <XCircle className="h-4 w-4" /> Cancelar oferta
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-2">
            <span className="font-display text-sm font-bold text-primary">
              R$ {Number(offer.offer_price).toFixed(2).replace(".", ",")}
            </span>
            <span className="text-xs text-muted-foreground line-through">
              R$ {Number(offer.original_price).toFixed(2).replace(".", ",")}
            </span>
          </div>

          {/* Progress */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {offer.sold_quantity}/{offer.min_quantity} reservas
              </span>
              <span className={`font-semibold ${isGoalReached ? "text-success" : "text-primary"}`}>
                {isGoalReached ? "Meta atingida!" : `Faltam ${offer.min_quantity - offer.sold_quantity}`}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Date */}
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {isExpired
              ? `Encerrou em ${endDate.toLocaleDateString("pt-BR")}`
              : `Encerra em ${endDate.toLocaleDateString("pt-BR")}`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
