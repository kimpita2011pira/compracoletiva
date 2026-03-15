import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { OfferWithVendor } from "@/hooks/useOffers";

export type ClosedOfferWithInterest = OfferWithVendor & {
  interest_count: number;
};

export function useClosedOffers() {
  return useQuery({
    queryKey: ["offers-closed"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("offers")
        .select("*, vendors(company_name)")
        .in("status", ["VALIDADA", "CANCELADA", "ENCERRADA"])
        .order("end_date", { ascending: false });
      if (error) throw error;

      const offers = (data ?? []) as OfferWithVendor[];
      if (offers.length === 0) return [] as ClosedOfferWithInterest[];

      // Fetch interest counts
      const offerIds = offers.map((o) => o.id);
      const { data: interests } = await supabase
        .from("offer_interests")
        .select("offer_id")
        .in("offer_id", offerIds);

      const countMap = new Map<string, number>();
      for (const i of interests ?? []) {
        countMap.set(i.offer_id, (countMap.get(i.offer_id) ?? 0) + 1);
      }

      return offers.map((o) => ({
        ...o,
        interest_count: countMap.get(o.id) ?? 0,
      })) as ClosedOfferWithInterest[];
    },
    staleTime: 1000 * 60,
  });
}
