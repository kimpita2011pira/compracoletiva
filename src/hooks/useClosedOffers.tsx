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
      // Fetch non-ATIVA offers
      const { data: statusClosed, error: err1 } = await supabase
        .from("offers")
        .select("*, vendors(company_name)")
        .in("status", ["VALIDADA", "CANCELADA", "ENCERRADA"])
        .order("end_date", { ascending: false });
      if (err1) throw err1;

      // Fetch ATIVA offers that are expired
      const { data: expiredActive, error: err2 } = await supabase
        .from("offers")
        .select("*, vendors(company_name)")
        .eq("status", "ATIVA")
        .lt("end_date", new Date().toISOString())
        .order("end_date", { ascending: false });
      if (err2) throw err2;

      const allClosed = [
        ...((statusClosed ?? []) as OfferWithVendor[]),
        ...((expiredActive ?? []) as OfferWithVendor[]),
      ];

      if (allClosed.length === 0) return [] as ClosedOfferWithInterest[];

      // Fetch interest counts
      const offerIds = allClosed.map((o) => o.id);
      const { data: interests } = await supabase
        .from("offer_interests")
        .select("offer_id")
        .in("offer_id", offerIds);

      const countMap = new Map<string, number>();
      for (const i of interests ?? []) {
        countMap.set(i.offer_id, (countMap.get(i.offer_id) ?? 0) + 1);
      }

      return allClosed
        .map((o) => ({
          ...o,
          interest_count: countMap.get(o.id) ?? 0,
        }))
        .sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime()) as ClosedOfferWithInterest[];
    },
    staleTime: 1000 * 60,
  });
}
