import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface FranchiseeMetrics {
  franchise: {
    id: string;
    commission_rate: number;
    active: boolean;
  };
  cities: { city: string; state: string }[];
  totals: {
    vendors: number;
    pendingVendors: number;
    offers: number;
    activeOffers: number;
    validatedOffers: number;
    cancelledOffers: number;
    totalOrders: number;
    totalRevenue: number;
    franchiseeCommissionEarned: number;
    pendingWithdrawals: number;
  };
  byCity: {
    city: string;
    offers: number;
    validated: number;
    orders: number;
    revenue: number;
    commission: number;
  }[];
  dailyRevenue: { date: string; revenue: number; commission: number }[];
  recentOrders: {
    id: string;
    offer_title: string;
    quantity: number;
    total_price: number;
    status: string;
    created_at: string;
    city: string | null;
  }[];
}

export function useFranchiseeMetrics(days = 30) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["franchisee-metrics", user?.id, days],
    enabled: !!user?.id,
    queryFn: async (): Promise<FranchiseeMetrics | null> => {
      if (!user?.id) return null;

      // 1. Get franchise + cities
      const { data: franchise } = await supabase
        .from("franchises")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!franchise) return null;

      const { data: cities } = await supabase
        .from("franchise_cities")
        .select("*")
        .eq("franchise_id", franchise.id);

      const cityList = cities ?? [];
      const cityNames = cityList.map((c) => c.city);

      if (cityNames.length === 0) {
        return {
          franchise: { id: franchise.id, commission_rate: Number(franchise.commission_rate), active: franchise.active },
          cities: cityList.map((c) => ({ city: c.city, state: c.state })),
          totals: {
            vendors: 0, pendingVendors: 0, offers: 0, activeOffers: 0, validatedOffers: 0,
            cancelledOffers: 0, totalOrders: 0, totalRevenue: 0, franchiseeCommissionEarned: 0, pendingWithdrawals: 0,
          },
          byCity: [], dailyRevenue: [], recentOrders: [],
        };
      }

      // 2. Vendors in cities
      const { data: vendors } = await supabase
        .from("vendors")
        .select("id,city,status")
        .in("city", cityNames);

      const vendorIds = (vendors ?? []).map((v) => v.id);

      // 3. Offers from those vendors
      const { data: offers } = vendorIds.length
        ? await supabase
            .from("offers")
            .select("id,title,city,status,vendor_id,created_at")
            .in("vendor_id", vendorIds)
        : { data: [] as any[] };

      const offerIds = (offers ?? []).map((o) => o.id);

      // 4. Orders for those offers
      const { data: orders } = offerIds.length
        ? await supabase
            .from("orders")
            .select("id,offer_id,quantity,total_price,status,created_at")
            .in("offer_id", offerIds)
            .order("created_at", { ascending: false })
        : { data: [] as any[] };

      // 5. Pending withdrawals
      const { data: withdrawals } = vendorIds.length
        ? await supabase
            .from("withdrawal_requests")
            .select("id,status")
            .in("vendor_id", vendorIds)
            .eq("status", "PENDENTE")
        : { data: [] as any[] };

      const rate = Number(franchise.commission_rate);
      const platformPct = 1; // 1% reservado à plataforma
      const franchiseePct = rate - platformPct;

      // Aggregate per offer/city
      const ordersByOffer = new Map<string, { count: number; revenue: number }>();
      (orders ?? []).forEach((o) => {
        if (o.status === "RESERVADO" || o.status === "CONFIRMADO") {
          const cur = ordersByOffer.get(o.offer_id) ?? { count: 0, revenue: 0 };
          cur.count += 1;
          cur.revenue += Number(o.total_price);
          ordersByOffer.set(o.offer_id, cur);
        }
      });

      const cityAgg = new Map<string, FranchiseeMetrics["byCity"][number]>();
      cityNames.forEach((c) =>
        cityAgg.set(c, { city: c, offers: 0, validated: 0, orders: 0, revenue: 0, commission: 0 })
      );

      let totalRevenue = 0;
      let totalOrders = 0;
      let activeOffers = 0;
      let validatedOffers = 0;
      let cancelledOffers = 0;
      let franchiseeCommissionEarned = 0;

      (offers ?? []).forEach((o) => {
        const orderInfo = ordersByOffer.get(o.id) ?? { count: 0, revenue: 0 };
        const cityRow = cityAgg.get(o.city ?? "") ?? null;

        if (o.status === "ATIVA") activeOffers += 1;
        if (o.status === "VALIDADA") validatedOffers += 1;
        if (o.status === "CANCELADA") cancelledOffers += 1;

        totalOrders += orderInfo.count;
        if (cityRow) {
          cityRow.offers += 1;
          if (o.status === "VALIDADA") cityRow.validated += 1;
          cityRow.orders += orderInfo.count;
        }

        if (o.status === "VALIDADA") {
          totalRevenue += orderInfo.revenue;
          const commission = orderInfo.revenue * (franchiseePct / 100);
          franchiseeCommissionEarned += commission;
          if (cityRow) {
            cityRow.revenue += orderInfo.revenue;
            cityRow.commission += commission;
          }
        }
      });

      // Daily revenue (last N days, based on validated offers' orders)
      const today = new Date();
      const dailyMap = new Map<string, { revenue: number; commission: number }>();
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        dailyMap.set(key, { revenue: 0, commission: 0 });
      }

      const offerById = new Map((offers ?? []).map((o) => [o.id, o]));
      (orders ?? []).forEach((o) => {
        const offer = offerById.get(o.offer_id);
        if (offer?.status !== "VALIDADA") return;
        const key = new Date(o.created_at).toISOString().slice(0, 10);
        if (!dailyMap.has(key)) return;
        const cur = dailyMap.get(key)!;
        cur.revenue += Number(o.total_price);
        cur.commission += Number(o.total_price) * (franchiseePct / 100);
      });

      const dailyRevenue = Array.from(dailyMap.entries()).map(([date, v]) => ({ date, ...v }));

      // Recent orders (top 10)
      const recentOrders = (orders ?? []).slice(0, 10).map((o) => {
        const offer = offerById.get(o.offer_id);
        return {
          id: o.id,
          offer_title: offer?.title ?? "—",
          quantity: o.quantity,
          total_price: Number(o.total_price),
          status: o.status,
          created_at: o.created_at,
          city: offer?.city ?? null,
        };
      });

      return {
        franchise: { id: franchise.id, commission_rate: rate, active: franchise.active },
        cities: cityList.map((c) => ({ city: c.city, state: c.state })),
        totals: {
          vendors: vendors?.length ?? 0,
          pendingVendors: (vendors ?? []).filter((v) => v.status === "PENDENTE").length,
          offers: offers?.length ?? 0,
          activeOffers,
          validatedOffers,
          cancelledOffers,
          totalOrders,
          totalRevenue,
          franchiseeCommissionEarned,
          pendingWithdrawals: withdrawals?.length ?? 0,
        },
        byCity: Array.from(cityAgg.values()).sort((a, b) => b.revenue - a.revenue),
        dailyRevenue,
        recentOrders,
      };
    },
  });
}
