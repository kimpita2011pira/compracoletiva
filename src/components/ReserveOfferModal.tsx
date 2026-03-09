import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { OfferWithVendor } from "@/hooks/useOffers";
import { useReserveOffer, useWalletBalance, useUserAddresses } from "@/hooks/useReserveOffer";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Minus, Plus, Wallet, MapPin, Truck, ShoppingBag, Loader2 } from "lucide-react";

interface Props {
  offer: OfferWithVendor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ReserveOfferModal({ offer, open, onOpenChange }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: balance, isLoading: balanceLoading } = useWalletBalance();
  const { data: addresses } = useUserAddresses();
  const reserve = useReserveOffer();

  const [quantity, setQuantity] = useState(1);
  const [deliveryType, setDeliveryType] = useState<"RETIRADA" | "DELIVERY">(
    offer.pickup_available ? "RETIRADA" : "DELIVERY"
  );
  const [addressId, setAddressId] = useState<string>("");

  const maxQty = offer.max_per_user ?? 99;
  const unitPrice = offer.offer_price;
  const deliveryFee = deliveryType === "DELIVERY" ? (offer.delivery_fee ?? 0) : 0;
  const totalPrice = unitPrice * quantity + deliveryFee;
  const hasEnoughBalance = (balance ?? 0) >= totalPrice;

  const handleConfirm = async () => {
    if (!user) {
      toast({ title: "Faça login para reservar", variant: "destructive" });
      return;
    }
    if (deliveryType === "DELIVERY" && !addressId) {
      toast({ title: "Selecione um endereço de entrega", variant: "destructive" });
      return;
    }
    try {
      await reserve.mutateAsync({
        offerId: offer.id,
        quantity,
        deliveryType,
        addressId: deliveryType === "DELIVERY" ? addressId : undefined,
      });
      toast({ title: "Reserva realizada com sucesso! 🎉" });
      onOpenChange(false);
      setQuantity(1);
    } catch (err: any) {
      const msg = err?.message?.replace(/^[^:]*:\s*/, "") ?? "Erro ao reservar";
      toast({ title: msg, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Reservar Oferta</DialogTitle>
          <DialogDescription className="line-clamp-1">{offer.title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Quantity */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Quantidade</Label>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-10 text-center font-display text-lg font-bold">{quantity}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                disabled={quantity >= maxQty}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground">máx {maxQty}</span>
            </div>
          </div>

          {/* Delivery type */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Tipo de entrega</Label>
            <RadioGroup
              value={deliveryType}
              onValueChange={(v) => setDeliveryType(v as "RETIRADA" | "DELIVERY")}
              className="grid grid-cols-2 gap-3"
            >
              {offer.pickup_available && (
                <Label
                  htmlFor="pickup"
                  className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                >
                  <RadioGroupItem value="RETIRADA" id="pickup" />
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Retirada</span>
                </Label>
              )}
              {offer.delivery_available && (
                <Label
                  htmlFor="delivery"
                  className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                >
                  <RadioGroupItem value="DELIVERY" id="delivery" />
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  <div className="text-sm">
                    Entrega
                    {offer.delivery_fee ? (
                      <span className="ml-1 text-xs text-muted-foreground">
                        +R$ {Number(offer.delivery_fee).toFixed(2).replace(".", ",")}
                      </span>
                    ) : null}
                  </div>
                </Label>
              )}
            </RadioGroup>
          </div>

          {/* Address selector for delivery */}
          {deliveryType === "DELIVERY" && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Endereço de entrega</Label>
              {addresses && addresses.length > 0 ? (
                <Select value={addressId} onValueChange={setAddressId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um endereço" />
                  </SelectTrigger>
                  <SelectContent>
                    {addresses.map((addr) => (
                      <SelectItem key={addr.id} value={addr.id}>
                        {addr.label || `${addr.street}, ${addr.number ?? "s/n"}`} – {addr.city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhum endereço cadastrado. Cadastre um endereço antes de pedir entrega.
                </p>
              )}
            </div>
          )}

          {/* Price summary */}
          <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {quantity}x R$ {unitPrice.toFixed(2).replace(".", ",")}
              </span>
              <span>R$ {(unitPrice * quantity).toFixed(2).replace(".", ",")}</span>
            </div>
            {deliveryFee > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Taxa de entrega</span>
                <span>R$ {deliveryFee.toFixed(2).replace(".", ",")}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-1.5 font-display font-bold">
              <span>Total</span>
              <span className="text-primary">R$ {totalPrice.toFixed(2).replace(".", ",")}</span>
            </div>
          </div>

          {/* Wallet balance */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-2 text-sm">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <span>Saldo da carteira</span>
            </div>
            {balanceLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <span className={`font-display font-bold ${hasEnoughBalance ? "text-success" : "text-destructive"}`}>
                R$ {(balance ?? 0).toFixed(2).replace(".", ",")}
              </span>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={reserve.isPending || !hasEnoughBalance || (deliveryType === "DELIVERY" && !addressId)}
            className="gap-2 font-bold"
          >
            {reserve.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShoppingBag className="h-4 w-4" />
            )}
            Confirmar Reserva
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
