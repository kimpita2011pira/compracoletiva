import { useNavigate } from "react-router-dom";
import { useOrders } from "@/hooks/useOrders";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Package, Truck, MapPin, ShoppingBag } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  RESERVADO: { label: "Reservado", variant: "secondary" },
  CONFIRMADO: { label: "Confirmado", variant: "default" },
  CANCELADO: { label: "Cancelado", variant: "destructive" },
  ESTORNADO: { label: "Estornado", variant: "outline" },
};

const MyOrders = () => {
  const navigate = useNavigate();
  const { data: orders, isLoading, error } = useOrders();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
        <div className="container flex h-16 items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <h1 className="font-display text-xl font-bold">Meus Pedidos</h1>
          </div>
          <NotificationBell />
        </div>
      </header>

      <main className="container max-w-2xl py-6 space-y-4">
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        )}

        {error && (
          <Card className="p-6 text-center text-destructive">
            Erro ao carregar pedidos. Tente novamente.
          </Card>
        )}

        {!isLoading && orders?.length === 0 && (
          <Card className="flex flex-col items-center gap-4 p-10 text-center">
            <div className="rounded-full bg-muted p-4">
              <ShoppingBag className="h-10 w-10 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold">Nenhum pedido ainda</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Explore as ofertas e faça sua primeira compra!
              </p>
            </div>
            <Button onClick={() => navigate("/offers")}>Ver Ofertas</Button>
          </Card>
        )}

        {orders?.map((order) => {
          const cfg = statusConfig[order.status] ?? statusConfig.RESERVADO;
          return (
            <Card key={order.id} className="overflow-hidden">
              <div className="flex gap-4 p-4">
                {/* Image */}
                <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                  {order.offer?.image_url ? (
                    <img
                      src={order.offer.image_url}
                      alt={order.offer.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Package className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex flex-1 flex-col justify-between min-w-0">
                  <div>
                    <h3 className="font-display font-bold truncate">
                      {order.offer?.title ?? "Oferta removida"}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {order.offer?.vendor_name}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <Badge variant={cfg.variant}>{cfg.label}</Badge>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      {order.delivery_type === "DELIVERY" ? (
                        <Truck className="h-3 w-3" />
                      ) : (
                        <MapPin className="h-3 w-3" />
                      )}
                      {order.delivery_type === "DELIVERY" ? "Entrega" : "Retirada"}
                    </span>
                  </div>
                </div>

                {/* Price */}
                <div className="flex flex-col items-end justify-between text-right">
                  <p className="font-display text-lg font-bold text-primary">
                    R$ {Number(order.total_price).toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {order.quantity}x R$ {Number(order.unit_price).toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(order.created_at), "dd MMM yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </main>
    </div>
  );
};

export default MyOrders;
