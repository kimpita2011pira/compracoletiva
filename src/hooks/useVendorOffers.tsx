import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useVendor } from "@/hooks/useVendor";
import type { Tables, Database } from "@/integrations/supabase/types";

type OfferStatus = Database["public"]["Enums"]["offer_status"];

export type VendorOffer = Tables<"offers"> & {
  orders_count?: number;
};

export function useVendorOffers() {
  const { vendor } = useVendor();

  const offersQuery = useQuery({
    queryKey: ["vendor-offers", vendor?.id],
    queryFn: async () => {
      if (!vendor) return [];
      const { data, error } = await supabase
        .from("offers")
        .select("*")
        .eq("vendor_id", vendor.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as VendorOffer[];
    },
    enabled: !!vendor,
    staleTime: 1000 * 60,
  });

  return {
    offers: offersQuery.data ?? [],
    isLoading: offersQuery.isLoading,
  };
}

export function useCancelOffer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (offerId: string) => {
      const { error } = await supabase
        .from("offers")
        .update({ status: "CANCELADA" as OfferStatus })
        .eq("id", offerId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-offers"] });
      queryClient.invalidateQueries({ queryKey: ["offers-active"] });
    },
  });
}
