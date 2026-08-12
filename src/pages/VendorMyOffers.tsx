import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useVendorOffers, useCancelOffer, useDeleteOffer, useReactivateOffer } from "@/hooks/useVendorOffers";
import { useVendor } from "@/hooks/useVendor";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft, Plus, ShoppingBag, Clock, CheckCircle, XCircle, Ban,
  Eye, MoreVertical, Pencil, Truck, Trash2, RefreshCcw
} from "lucide-react";
import { VendorOffersOrdersDialog } from "@/components/VendorOffersOrdersDialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CATEGORY_MAP } from "./OffersMarketplace";
import type { VendorOffer } from "@/hooks/useVendorOffers";

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  ATIVA: { label: "Ativa", icon: Clock, variant: "default" },
  VALIDADA: { label: "Validada", icon: CheckCircle, variant: "secondary" },
  CANCELADA: { label: "Cancelada", icon: XCircle, variant: "destructive" },
  EXPIRADA: { label: "Expirada", icon: Ban, variant: "destructive" },
  ENCERRADA: { label: "Encerrada", icon: Ban, variant: "outline" },
};

export default function VendorMyOffers() {
  const navigate = useNavigate();
  const { vendor, isLoading: vendorLoading } = useVendor();
  const { offers, isLoading } = useVendorOffers();
  const cancelOffer = useCancelOffer();
  const deleteOffer = useDeleteOffer();
  const reactivateOffer = useReactivateOffer();
  
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [reactivateData, setReactivateData] = useState<{ id: string; title: string; status: string } | null>(null);
  const [newEndDate, setNewEndDate] = useState("");
  const [ordersOffer, setOrdersOffer] = useState<{ id: string; title: string } | null>(null);

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

  const handleDelete = async (id: string) => {
    try {
      await deleteOffer.mutateAsync(id);
      setDeleteId(null);
    } catch {
      // toast is handled in hook
    }
  };

  const handleReactivate = async () => {
    if (!reactivateData || !newEndDate) return;
    try {
      await reactivateOffer.mutateAsync({ 
        offerId: reactivateData.id, 
        newEndDate: new Date(newEndDate).toISOString() 
      });
      setReactivateData(null);
      setNewEndDate("");
    } catch {
      // toast is handled in hook
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
                onDelete={() => setDeleteId(offer.id)}
                onReactivate={() => {
                  setReactivateData({ id: offer.id, title: offer.title, status: offer.status });
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 7);
                  setNewEndDate(tomorrow.toISOString().split('T')[0]);
                }}
                onViewOrders={() => setOrdersOffer({ id: offer.id, title: offer.title })}
              />
            ))}
          </div>
        )}

        {/* Cancel confirmation dialog */}
        <AlertDialog open={!!cancelId} onOpenChange={(open) => !open && setCancelId(null)}>
          <AlertDialogContent>
            {cancelId && (
              <>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancelar oferta?</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-3">
                    <p>
                      Esta ação não pode ser desfeita. A oferta <strong>"{offers.find(o => o.id === cancelId)?.title}"</strong> será encerrada imediatamente.
                    </p>
                    <div className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
                      <strong>⚠️ Aviso importante:</strong> Os clientes que reservaram o produto serão notificados automaticamente e os valores pagos serão estornados para suas carteiras.
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Não, manter ativa</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => cancelId && handleCancel(cancelId)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Sim, cancelar oferta
                  </AlertDialogAction>
                </AlertDialogFooter>
              </>
            )}
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete confirmation dialog */}
        <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir oferta?</AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <p>
                  Esta ação excluirá permanentemente a oferta <strong>"{offers.find(o => o.id === deleteId)?.title}"</strong>.
                </p>
                <div className="rounded-lg bg-muted p-3 text-xs">
                  <strong>Status atual:</strong> {deleteId && STATUS_CONFIG[offers.find(o => o.id === deleteId)?.status || ""]?.label}
                  <br />
                  <strong>Efeito:</strong> A oferta será removida do histórico. Só é possível excluir ofertas que não possuem pedidos.
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Voltar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteId && handleDelete(deleteId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Sim, excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Reactivate dialog */}
        <AlertDialog open={!!reactivateData} onOpenChange={(open) => !open && setReactivateData(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reativar Oferta</AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <p>
                  Defina a nova data de validade para a oferta <strong>"{reactivateData?.title}"</strong>.
                </p>
                <div className="rounded-lg bg-muted p-3 text-xs">
                  <strong>Status atual:</strong> {reactivateData?.status && STATUS_CONFIG[reactivateData.status]?.label}
                  <br />
                  <strong>Efeito:</strong> A oferta voltará a ficar <strong>ATIVA</strong> no marketplace e a contagem de tempo será reiniciada até a nova data.
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-end-date">Nova Data de Encerramento</Label>
                <Input
                  id="new-end-date"
                  type="date"
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              {newEndDate && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-primary">Resumo da Reativação</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">Nova data:</span>
                    <span className="font-medium">{new Date(newEndDate + "T12:00:00").toLocaleDateString("pt-BR")}</span>
                    <span className="text-muted-foreground">Status final:</span>
                    <span className="font-medium text-success">ATIVA</span>
                  </div>
                </div>
              )}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleReactivate}
                disabled={!newEndDate || reactivateOffer.isPending}
              >
                {reactivateOffer.isPending ? "Reativando..." : "Confirmar Reativação"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Pedidos e endereços de entrega da oferta */}
        <VendorOffersOrdersDialog
          offerId={ordersOffer?.id ?? null}
          offerTitle={ordersOffer?.title}
          onOpenChange={(open) => !open && setOrdersOffer(null)}
        />
      </main>
    </AppLayout>
  );
}

function OfferRow({
  offer,
  onView,
  onEdit,
  onCancel,
  onDelete,
  onReactivate,
  onViewOrders,
}: {
  offer: VendorOffer;
  onView: () => void;
  onEdit: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onReactivate: () => void;
  onViewOrders: () => void;
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
                <DropdownMenuItem onClick={onViewOrders} className="gap-2">
                  <Truck className="h-4 w-4" /> Pedidos e entregas
                </DropdownMenuItem>
                {offer.status === "ATIVA" && (
                  <DropdownMenuItem onClick={onEdit} className="gap-2">
                    <Pencil className="h-4 w-4" /> Editar oferta
                  </DropdownMenuItem>
                )}
                {(offer.status === "ATIVA") && (
                  <DropdownMenuItem onClick={onCancel} className="gap-2 text-destructive focus:text-destructive">
                    <XCircle className="h-4 w-4" /> Cancelar oferta
                  </DropdownMenuItem>
                )}
                {(offer.status === "EXPIRADA" || offer.status === "CANCELADA" || offer.status === "ENCERRADA") && (
                  <DropdownMenuItem onClick={onReactivate} className="gap-2 text-primary focus:text-primary">
                    <RefreshCcw className="h-4 w-4" /> Reativar oferta
                  </DropdownMenuItem>
                )}
                {(offer.status === "EXPIRADA" || offer.status === "CANCELADA" || offer.status === "ENCERRADA") && (
                  <DropdownMenuItem onClick={onDelete} className="gap-2 text-destructive focus:text-destructive">
                    <Trash2 className="h-4 w-4" /> Excluir oferta
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
