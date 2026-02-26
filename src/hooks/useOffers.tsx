import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type OfferWithVendor = Tables<"offers"> & {
  vendors: Pick<Tables<"vendors">, "company_name"> | null;
  category?: string | null;
};

export function useOffers() {
  return useQuery({
    queryKey: ["offers-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("offers")
        .select("*, vendors(company_name)")
        .eq("status", "ATIVA")
        .order("end_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as OfferWithVendor[];
    },
    staleTime: 1000 * 60, // 1 minute
  });
}
