import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useWalletBalance() {
  return useQuery({
    queryKey: ["wallet-balance"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data?.balance ?? 0;
    },
  });
}

export function useUserAddresses() {
  return useQuery({
    queryKey: ["user-addresses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("addresses")
        .select("*")
        .order("is_default", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

interface ReserveParams {
  offerId: string;
  quantity: number;
  deliveryType: "DELIVERY" | "RETIRADA";
  addressId?: string;
}

export function useReserveOffer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ offerId, quantity, deliveryType, addressId }: ReserveParams) => {
      const { data, error } = await supabase.rpc("reserve_offer", {
        p_offer_id: offerId,
        p_quantity: quantity,
        p_delivery_type: deliveryType,
        p_address_id: addressId ?? null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offers-active"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-balance"] });
    },
  });
}
