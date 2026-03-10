import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PromoBanner {
  id: string;
  message: string;
  active: boolean;
  position: number;
  created_at: string;
}

export function usePromoBanners(onlyActive = true) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["promo-banners", onlyActive],
    queryFn: async () => {
      let q = supabase
        .from("promo_banners")
        .select("*")
        .order("position", { ascending: true });

      if (onlyActive) {
        q = q.eq("active", true);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data as PromoBanner[];
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["promo-banners"] });

  const addBanner = useMutation({
    mutationFn: async (message: string) => {
      const { error } = await supabase.from("promo_banners").insert({ message });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateBanner = useMutation({
    mutationFn: async ({ id, message, active }: { id: string; message?: string; active?: boolean }) => {
      const updates: Record<string, unknown> = {};
      if (message !== undefined) updates.message = message;
      if (active !== undefined) updates.active = active;
      const { error } = await supabase.from("promo_banners").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteBanner = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("promo_banners").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { banners: query.data ?? [], isLoading: query.isLoading, addBanner, updateBanner, deleteBanner };
}
