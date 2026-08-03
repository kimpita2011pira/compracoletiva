import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Truck, Phone, User } from "lucide-react";
import { useVendorOfferOrders, formatDeliveryAddress } from "@/hooks/useVendorOfferOrders";

interface VendorOffersOrdersDialogProps {
  offerId: string | null;
  offerTitle?: string;
  onOpenChange: (open: boolean) => void;
}

const STATUS_LABEL: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  RESERVADO: { label: "Reservado", variant: "secondary" },
  CONFIRMADO: { label: "Confirmado", variant: "default" },
  CANCELADO: { label: "Cancelado", variant: "destructive" },
  ESTORNADO: { label: "Estornado", variant: "outline" },
};

export function VendorOffersOrdersDialog({ offerId, offerTitle, onOpenChange }: VendorOffersOrdersDialogProps) {
  const { data: orders, isLoading, error } = useVendorOfferOrders(offerId);

  return (
    <Dialog open={!!offerId} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pedidos e entregas</DialogTitle>
          <DialogDescription>{offerTitle ?? "Reservas desta oferta"}</DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="space-y-3">
            {[1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive">Erro ao carregar os pedidos. Tente novamente.</p>
        )}

        {!isLoading && orders?.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma reserva nesta oferta ainda.</p>
        )}

        <div className="space-y-3">
          {orders?.map((o) => {
            const cfg = STATUS_LABEL[o.status] ?? STATUS_LABEL.RESERVADO;
            const address = formatDeliveryAddress(o);
            return (
              <Card key={o.order_id}>
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-sm font-semibold">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        {o.buyer_name ?? "Cliente"}
                      </p>
                      {o.buyer_phone && (
                        <a
                          href={`https://wa.me/55${o.buyer_phone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-0.5 flex items-center gap-1.5 text-xs text-primary underline-offset-2 hover:underline"
                        >
                          <Phone className="h-3 w-3" /> {o.buyer_phone}
                        </a>
                      )}
                    </div>
                    <Badge variant={cfg.variant}>{cfg.label}</Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>{o.quantity}x</span>
                    <span className="font-semibold text-foreground">
                      R$ {Number(o.total_price).toFixed(2)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      {o.delivery_type === "DELIVERY" ? <Truck className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                      {o.delivery_type === "DELIVERY" ? "Entrega" : "Retirada"}
                    </span>
                  </div>

                  {o.delivery_type === "DELIVERY" && (
                    <div className="rounded-lg bg-muted/50 p-3 text-xs">
                      <p className="mb-1 font-semibold">
                        Endereço de entrega{o.address_label ? ` (${o.address_label})` : ""}
                      </p>
                      <p className="text-muted-foreground">
                        {address ?? "Endereço não informado pelo cliente."}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
