import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AdminMetrics {
  totalUsers: number;
  totalVendors: number;
  totalOffers: number;
  activeOffers: number;
  totalOrders: number;
  totalRevenue: number;
  platformBalance: number;
  recentOrders: {
    id: string;
    total_price: number;
    status: string;
    created_at: string;
    quantity: number;
    offer_title: string;
  }[];
  ordersByStatus: { status: string; count: number }[];
  offersByStatus: { status: string; count: number }[];
  dailyRevenue: { date: string; revenue: number; orders: number }[];
}

export function useAdminMetrics() {
  const queryClient = useQueryClient();

  // Realtime subscriptions to invalidate metrics on changes
  useEffect(() => {
    const channel = supabase
      .channel('admin-metrics-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        queryClient.invalidateQueries({ queryKey: ["admin-metrics"] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'offers' }, () => {
        queryClient.invalidateQueries({ queryKey: ["admin-metrics"] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendors' }, () => {
        queryClient.invalidateQueries({ queryKey: ["admin-metrics"] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        queryClient.invalidateQueries({ queryKey: ["admin-metrics"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const query = useQuery<AdminMetrics>({
    queryKey: ["admin-metrics"],
    refetchInterval: 30000, // fallback: refetch every 30s
    queryFn: async () => {
      // Parallel queries
      const [
        profilesRes,
        vendorsRes,
        offersRes,
        ordersRes,
        platformWalletRes,
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("vendors").select("id, status"),
        supabase.from("offers").select("id, status, sold_quantity, offer_price"),
        supabase.from("orders").select("id, total_price, status, created_at, quantity, offer_id"),
        supabase.from("platform_wallet").select("balance").maybeSingle(),
      ]);

      // Get offer titles for recent orders
      const orders = ordersRes.data ?? [];
      const offerIds = [...new Set(orders.map(o => o.offer_id))];
      let offerTitlesMap: Record<string, string> = {};
      if (offerIds.length > 0) {
        const { data: offerTitles } = await supabase
          .from("offers")
          .select("id, title")
          .in("id", offerIds);
        offerTitlesMap = Object.fromEntries(
          (offerTitles ?? []).map(o => [o.id, o.title])
        );
      }

      const vendors = vendorsRes.data ?? [];
      const offers = offersRes.data ?? [];

      // Orders by status
      const statusCounts: Record<string, number> = {};
      let totalRevenue = 0;
      orders.forEach(o => {
        statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
        if (o.status === "CONFIRMADO" || o.status === "RESERVADO") {
          totalRevenue += Number(o.total_price);
        }
      });

      // Offers by status
      const offerStatusCounts: Record<string, number> = {};
      offers.forEach(o => {
        offerStatusCounts[o.status] = (offerStatusCounts[o.status] || 0) + 1;
      });

      // Daily revenue (last 14 days)
      const dailyMap: Record<string, { revenue: number; orders: number }> = {};
      const now = new Date();
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split("T")[0];
        dailyMap[key] = { revenue: 0, orders: 0 };
      }
      orders.forEach(o => {
        const day = o.created_at.split("T")[0];
        if (dailyMap[day]) {
          dailyMap[day].revenue += Number(o.total_price);
          dailyMap[day].orders += 1;
        }
      });

      // Recent orders (last 10)
      const recentOrders = [...orders]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10)
        .map(o => ({
          ...o,
          offer_title: offerTitlesMap[o.offer_id] ?? "Oferta removida",
        }));

      return {
        totalUsers: profilesRes.count ?? 0,
        totalVendors: vendors.length,
        totalOffers: offers.length,
        activeOffers: offers.filter(o => o.status === "ATIVA").length,
        totalOrders: orders.length,
        totalRevenue,
        platformBalance: Number(platformWalletRes.data?.balance ?? 0),
        recentOrders,
        ordersByStatus: Object.entries(statusCounts).map(([status, count]) => ({ status, count })),
        offersByStatus: Object.entries(offerStatusCounts).map(([status, count]) => ({ status, count })),
        dailyRevenue: Object.entries(dailyMap).map(([date, v]) => ({ date, ...v })),
      };
    },
  });
}
