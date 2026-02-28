import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useVendor } from "@/hooks/useVendor";

export interface VendorMetrics {
  activeOffers: number;
  totalOffers: number;
  totalSold: number;
  totalRevenue: number;
  validatedOffers: number;
  pendingOrders: number;
}

export function useVendorMetrics() {
  const { vendor } = useVendor();

  return useQuery({
    queryKey: ["vendor-metrics", vendor?.id],
    enabled: !!vendor,
    staleTime: 1000 * 60 * 2,
    queryFn: async (): Promise<VendorMetrics> => {
      if (!vendor) throw new Error("No vendor");

      // Fetch all offers for this vendor
      const { data: offers, error: offersErr } = await supabase
        .from("offers")
        .select("id, status, sold_quantity, offer_price")
        .eq("vendor_id", vendor.id);
      if (offersErr) throw offersErr;

      const offersList = offers ?? [];
      const activeOffers = offersList.filter((o) => o.status === "ATIVA").length;
      const validatedOffers = offersList.filter((o) => o.status === "VALIDADA").length;
      const totalSold = offersList.reduce((sum, o) => sum + (o.sold_quantity ?? 0), 0);
      const totalRevenue = offersList.reduce(
        (sum, o) => sum + (o.sold_quantity ?? 0) * Number(o.offer_price),
        0
      );

      // Fetch pending orders count across vendor's offers
      const offerIds = offersList.map((o) => o.id);
      let pendingOrders = 0;
      if (offerIds.length > 0) {
        const { count, error: ordersErr } = await supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .in("offer_id", offerIds)
          .eq("status", "RESERVADO");
        if (!ordersErr) pendingOrders = count ?? 0;
      }

      return {
        activeOffers,
        totalOffers: offersList.length,
        totalSold,
        totalRevenue,
        validatedOffers,
        pendingOrders,
      };
    },
  });
}
