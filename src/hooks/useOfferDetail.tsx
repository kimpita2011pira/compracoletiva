import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { OfferWithVendor } from "@/hooks/useOffers";

export interface Review {
  id: string;
  offer_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  profiles: { name: string; avatar_url: string | null } | null;
}

export function useOfferDetail(offerId: string | undefined) {
  return useQuery({
    queryKey: ["offer-detail", offerId],
    enabled: !!offerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("offers")
        .select("*, vendors(company_name, description)")
        .eq("id", offerId!)
        .single();
      if (error) throw error;
      return data as OfferWithVendor & { vendors: { company_name: string; description: string | null } | null };
    },
  });
}

export function useOfferReviews(offerId: string | undefined) {
  return useQuery({
    queryKey: ["offer-reviews", offerId],
    enabled: !!offerId,
    queryFn: async () => {
      const { data: reviewsData, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("offer_id", offerId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!reviewsData || reviewsData.length === 0) return [] as Review[];

      // Fetch profiles for review authors
      const userIds = [...new Set(reviewsData.map((r) => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);

      return reviewsData.map((r) => ({
        ...r,
        profiles: profileMap.get(r.user_id) ?? null,
      })) as Review[];
    },
  });
}

export function useSubmitReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { offerId: string; rating: number; comment: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const { error } = await supabase.from("reviews").upsert(
        { offer_id: params.offerId, user_id: user.id, rating: params.rating, comment: params.comment },
        { onConflict: "user_id,offer_id" }
      );
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["offer-reviews", vars.offerId] });
    },
  });
}
