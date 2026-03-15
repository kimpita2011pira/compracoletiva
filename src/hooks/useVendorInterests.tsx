import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useVendor } from "@/hooks/useVendor";

export interface OfferInterestSummary {
  offer_id: string;
  title: string;
  status: string;
  end_date: string;
  interest_count: number;
}

export function useVendorInterests() {
  const { vendor } = useVendor();

  return useQuery({
    queryKey: ["vendor-interests", vendor?.id],
    enabled: !!vendor,
    staleTime: 1000 * 60 * 2,
    queryFn: async (): Promise<OfferInterestSummary[]> => {
      if (!vendor) return [];

      // Get vendor's non-active offers (encerradas, canceladas, validadas)
      const { data: offers, error: offersErr } = await supabase
        .from("offers")
        .select("id, title, status, end_date")
        .eq("vendor_id", vendor.id);
      if (offersErr) throw offersErr;

      // Filter: expired (end_date past) or non-ATIVA status
      const now = new Date();
      const closedOffers = (offers ?? []).filter(
        (o) => o.status !== "ATIVA" || new Date(o.end_date) < now
      );

      if (closedOffers.length === 0) return [];

      const offerIds = closedOffers.map((o) => o.id);

      // Get interest counts
      const { data: interests, error: intErr } = await supabase
        .from("offer_interests")
        .select("offer_id")
        .in("offer_id", offerIds);
      if (intErr) throw intErr;

      // Count per offer
      const countMap = new Map<string, number>();
      for (const i of interests ?? []) {
        countMap.set(i.offer_id, (countMap.get(i.offer_id) ?? 0) + 1);
      }

      return closedOffers
        .map((o) => ({
          offer_id: o.id,
          title: o.title,
          status: o.status,
          end_date: o.end_date,
          interest_count: countMap.get(o.id) ?? 0,
        }))
        .sort((a, b) => b.interest_count - a.interest_count);
    },
  });
}
