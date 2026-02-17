import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface OrderWithOffer {
  id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  status: "RESERVADO" | "CONFIRMADO" | "CANCELADO" | "ESTORNADO";
  delivery_type: "DELIVERY" | "RETIRADA";
  created_at: string;
  updated_at: string;
  offer: {
    id: string;
    title: string;
    image_url: string | null;
    vendor_name: string;
  } | null;
}

export function useOrders() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-orders", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<OrderWithOffer[]> => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id, quantity, unit_price, total_price, status, delivery_type, created_at, updated_at,
          offers ( id, title, image_url, vendors ( company_name ) )
        `)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data ?? []).map((o: any) => ({
        id: o.id,
        quantity: o.quantity,
        unit_price: o.unit_price,
        total_price: o.total_price,
        status: o.status,
        delivery_type: o.delivery_type,
        created_at: o.created_at,
        updated_at: o.updated_at,
        offer: o.offers
          ? {
              id: o.offers.id,
              title: o.offers.title,
              image_url: o.offers.image_url,
              vendor_name: o.offers.vendors?.company_name ?? "Vendedor",
            }
          : null,
      }));
    },
  });
}
