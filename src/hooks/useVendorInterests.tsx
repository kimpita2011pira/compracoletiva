import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useVendor } from "@/hooks/useVendor";

export interface OfferInterestSummary {
  offer_id: string;
  title: string;
  description: string | null;
  category: string | null;
  original_price: number;
  offer_price: number;
  min_quantity: number;
  max_per_user: number | null;
  delivery_available: boolean | null;
  delivery_fee: number | null;
  pickup_available: boolean | null;
  estimated_delivery_time: string | null;
  city: string | null;
  image_url: string | null;
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

      const { data: offers, error: offersErr } = await supabase
        .from("offers")
        .select("id, title, description, category, original_price, offer_price, min_quantity, max_per_user, delivery_available, delivery_fee, pickup_available, estimated_delivery_time, city, image_url, status, end_date")
        .eq("vendor_id", vendor.id);
      if (offersErr) throw offersErr;

      const now = new Date();
      const closedOffers = (offers ?? []).filter(
        (o) => o.status !== "ATIVA" || new Date(o.end_date) < now
      );

      if (closedOffers.length === 0) return [];

      const offerIds = closedOffers.map((o) => o.id);

      const { data: interests, error: intErr } = await supabase
        .from("offer_interests")
        .select("offer_id")
        .in("offer_id", offerIds);
      if (intErr) throw intErr;

      const countMap = new Map<string, number>();
      for (const i of interests ?? []) {
        countMap.set(i.offer_id, (countMap.get(i.offer_id) ?? 0) + 1);
      }

      return closedOffers
        .map((o) => ({
          offer_id: o.id,
          title: o.title,
          description: o.description,
          category: o.category,
          original_price: Number(o.original_price),
          offer_price: Number(o.offer_price),
          min_quantity: o.min_quantity,
          max_per_user: o.max_per_user,
          delivery_available: o.delivery_available,
          delivery_fee: o.delivery_fee ? Number(o.delivery_fee) : null,
          pickup_available: o.pickup_available,
          estimated_delivery_time: o.estimated_delivery_time,
          city: o.city,
          image_url: o.image_url,
          status: o.status,
          end_date: o.end_date,
          interest_count: countMap.get(o.id) ?? 0,
        }))
        .sort((a, b) => b.interest_count - a.interest_count);
    },
  });
}
