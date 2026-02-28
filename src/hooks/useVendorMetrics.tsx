import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useVendor } from "@/hooks/useVendor";
import { format, subDays, startOfDay } from "date-fns";

export interface VendorMetrics {
  activeOffers: number;
  totalOffers: number;
  totalSold: number;
  totalRevenue: number;
  validatedOffers: number;
  pendingOrders: number;
}

export interface SalesDataPoint {
  date: string;
  vendas: number;
  receita: number;
}

export function useVendorMetrics() {
  const { vendor } = useVendor();

  return useQuery({
    queryKey: ["vendor-metrics", vendor?.id],
    enabled: !!vendor,
    staleTime: 1000 * 60 * 2,
    queryFn: async (): Promise<VendorMetrics> => {
      if (!vendor) throw new Error("No vendor");

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

export function useVendorSalesHistory(days = 14) {
  const { vendor } = useVendor();

  return useQuery({
    queryKey: ["vendor-sales-history", vendor?.id, days],
    enabled: !!vendor,
    staleTime: 1000 * 60 * 5,
    queryFn: async (): Promise<SalesDataPoint[]> => {
      if (!vendor) return [];

      // Get vendor's offer ids
      const { data: offers } = await supabase
        .from("offers")
        .select("id")
        .eq("vendor_id", vendor.id);
      const offerIds = (offers ?? []).map((o) => o.id);
      if (offerIds.length === 0) {
        return buildEmptyDays(days);
      }

      const since = startOfDay(subDays(new Date(), days - 1)).toISOString();
      const { data: orders, error } = await supabase
        .from("orders")
        .select("quantity, total_price, created_at")
        .in("offer_id", offerIds)
        .gte("created_at", since)
        .in("status", ["RESERVADO", "CONFIRMADO"]);
      if (error) throw error;

      // Group by day
      const map = new Map<string, { vendas: number; receita: number }>();
      for (let i = 0; i < days; i++) {
        const key = format(subDays(new Date(), days - 1 - i), "dd/MM");
        map.set(key, { vendas: 0, receita: 0 });
      }
      for (const o of orders ?? []) {
        const key = format(new Date(o.created_at), "dd/MM");
        const entry = map.get(key);
        if (entry) {
          entry.vendas += o.quantity;
          entry.receita += Number(o.total_price);
        }
      }

      return Array.from(map.entries()).map(([date, v]) => ({ date, ...v }));
    },
  });
}

function buildEmptyDays(days: number): SalesDataPoint[] {
  return Array.from({ length: days }, (_, i) => ({
    date: format(subDays(new Date(), days - 1 - i), "dd/MM"),
    vendas: 0,
    receita: 0,
  }));
}
