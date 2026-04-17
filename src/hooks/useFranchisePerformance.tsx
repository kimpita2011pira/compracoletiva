import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FranchisePerformanceRow {
  franchise_id: string | null;
  franchise_name: string;
  commission_rate: number | null;
  cities: string[];
  total_offers: number;
  active_offers: number;
  validated_offers: number;
  cancelled_offers: number;
  total_orders: number;
  total_revenue: number;
  franchisee_commission: number;
  platform_commission: number;
}

export interface CityPerformanceRow {
  city: string;
  franchise_name: string | null;
  total_offers: number;
  validated_offers: number;
  total_orders: number;
  total_revenue: number;
}

export function useFranchisePerformance() {
  return useQuery({
    queryKey: ["franchise-performance"],
    queryFn: async (): Promise<{
      byFranchise: FranchisePerformanceRow[];
      byCity: CityPerformanceRow[];
      unassigned: FranchisePerformanceRow;
    }> => {
      const [
        { data: franchises },
        { data: franchiseCities },
        { data: profiles },
        { data: offers },
        { data: orders },
      ] = await Promise.all([
        supabase.from("franchises").select("*"),
        supabase.from("franchise_cities").select("*"),
        supabase.from("profiles").select("id,name"),
        supabase.from("offers").select("id,city,status,vendor_id"),
        supabase.from("orders").select("offer_id,total_price,status"),
      ]);

      // Map: city -> franchise
      const cityToFranchise = new Map<string, { id: string; rate: number; name: string }>();
      (franchiseCities ?? []).forEach((fc) => {
        const f = franchises?.find((x) => x.id === fc.franchise_id);
        const profile = profiles?.find((p) => p.id === f?.user_id);
        if (f) {
          cityToFranchise.set(fc.city.toLowerCase(), {
            id: f.id,
            rate: Number(f.commission_rate),
            name: profile?.name ?? "Franqueado",
          });
        }
      });

      // Aggregate orders by offer
      const ordersByOffer = new Map<string, { count: number; revenue: number }>();
      (orders ?? []).forEach((o) => {
        if (o.status === "RESERVADO" || o.status === "CONFIRMADO") {
          const cur = ordersByOffer.get(o.offer_id) ?? { count: 0, revenue: 0 };
          cur.count += 1;
          cur.revenue += Number(o.total_price);
          ordersByOffer.set(o.offer_id, cur);
        }
      });

      // Aggregate by franchise
      const franchiseAgg = new Map<string, FranchisePerformanceRow>();
      const unassigned: FranchisePerformanceRow = {
        franchise_id: null,
        franchise_name: "Sem franquia (10% padrão)",
        commission_rate: 10,
        cities: [],
        total_offers: 0,
        active_offers: 0,
        validated_offers: 0,
        cancelled_offers: 0,
        total_orders: 0,
        total_revenue: 0,
        franchisee_commission: 0,
        platform_commission: 0,
      };
      const unassignedCities = new Set<string>();

      // Init franchise rows
      (franchises ?? []).forEach((f) => {
        const profile = profiles?.find((p) => p.id === f.user_id);
        const cities = (franchiseCities ?? [])
          .filter((fc) => fc.franchise_id === f.id)
          .map((fc) => `${fc.city}/${fc.state}`);
        franchiseAgg.set(f.id, {
          franchise_id: f.id,
          franchise_name: profile?.name ?? "Franqueado",
          commission_rate: Number(f.commission_rate),
          cities,
          total_offers: 0,
          active_offers: 0,
          validated_offers: 0,
          cancelled_offers: 0,
          total_orders: 0,
          total_revenue: 0,
          franchisee_commission: 0,
          platform_commission: 0,
        });
      });

      // City aggregation
      const cityAgg = new Map<string, CityPerformanceRow>();

      (offers ?? []).forEach((o) => {
        const cityKey = o.city ?? "—";
        const fInfo = o.city ? cityToFranchise.get(o.city.toLowerCase()) : undefined;
        const orderInfo = ordersByOffer.get(o.id) ?? { count: 0, revenue: 0 };

        // City row
        const cityRow = cityAgg.get(cityKey) ?? {
          city: cityKey,
          franchise_name: fInfo?.name ?? null,
          total_offers: 0,
          validated_offers: 0,
          total_orders: 0,
          total_revenue: 0,
        };
        cityRow.total_offers += 1;
        if (o.status === "VALIDADA") cityRow.validated_offers += 1;
        cityRow.total_orders += orderInfo.count;
        cityRow.total_revenue += orderInfo.revenue;
        cityAgg.set(cityKey, cityRow);

        // Franchise row
        const target = fInfo ? franchiseAgg.get(fInfo.id) : null;
        const row = target ?? unassigned;
        if (!target) unassignedCities.add(cityKey);

        row.total_offers += 1;
        if (o.status === "ATIVA") row.active_offers += 1;
        if (o.status === "VALIDADA") row.validated_offers += 1;
        if (o.status === "CANCELADA") row.cancelled_offers += 1;
        row.total_orders += orderInfo.count;

        // Only validated offers generate commission
        if (o.status === "VALIDADA") {
          row.total_revenue += orderInfo.revenue;
          if (target && fInfo) {
            const totalComm = orderInfo.revenue * (fInfo.rate / 100);
            const platCut = orderInfo.revenue * 0.01;
            row.platform_commission += platCut;
            row.franchisee_commission += totalComm - platCut;
          } else {
            row.platform_commission += orderInfo.revenue * 0.10;
          }
        }
      });

      unassigned.cities = Array.from(unassignedCities);

      return {
        byFranchise: Array.from(franchiseAgg.values()).sort((a, b) => b.total_revenue - a.total_revenue),
        byCity: Array.from(cityAgg.values()).sort((a, b) => b.total_revenue - a.total_revenue),
        unassigned,
      };
    },
  });
}
