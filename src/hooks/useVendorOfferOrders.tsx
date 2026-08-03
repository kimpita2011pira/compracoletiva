import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface VendorOfferOrder {
  order_id: string;
  created_at: string;
  status: "RESERVADO" | "CONFIRMADO" | "CANCELADO" | "ESTORNADO";
  quantity: number;
  total_price: number;
  delivery_type: "DELIVERY" | "RETIRADA";
  buyer_name: string | null;
  buyer_phone: string | null;
  address_label: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
}

/**
 * Lista os pedidos de uma oferta do vendedor, incluindo o endereço de entrega.
 * Usa RPC SECURITY DEFINER porque a tabela `addresses` só é legível pelo dono.
 */
export function useVendorOfferOrders(offerId: string | null) {
  return useQuery({
    queryKey: ["vendor-offer-orders", offerId],
    enabled: !!offerId,
    queryFn: async (): Promise<VendorOfferOrder[]> => {
      const { data, error } = await supabase.rpc("vendor_list_offer_orders", {
        p_offer_id: offerId!,
      });
      if (error) throw error;
      return (data ?? []) as VendorOfferOrder[];
    },
  });
}

export function formatDeliveryAddress(o: VendorOfferOrder): string | null {
  if (!o.street) return null;
  const parts = [
    `${o.street}${o.number ? `, ${o.number}` : ""}`,
    o.complement,
    o.neighborhood,
    o.city && o.state ? `${o.city} - ${o.state}` : o.city,
    o.zip_code ? `CEP ${o.zip_code}` : null,
  ].filter(Boolean);
  return parts.join(" • ");
}
