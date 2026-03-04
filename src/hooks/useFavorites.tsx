import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useFavorites() {
  const { user } = useAuth();

  const { data: favoriteIds = [], ...rest } = useQuery({
    queryKey: ["favorites", user?.id],
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorites")
        .select("offer_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []).map((f) => f.offer_id);
    },
  });

  return { favoriteIds, ...rest };
}

export function useToggleFavorite() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ offerId, isFavorited }: { offerId: string; isFavorited: boolean }) => {
      if (!user) throw new Error("Not authenticated");

      if (isFavorited) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("offer_id", offerId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("favorites")
          .insert({ user_id: user.id, offer_id: offerId });
        if (error) throw error;
      }
    },
    onMutate: async ({ offerId, isFavorited }) => {
      await queryClient.cancelQueries({ queryKey: ["favorites", user?.id] });
      const prev = queryClient.getQueryData<string[]>(["favorites", user?.id]) ?? [];
      const next = isFavorited ? prev.filter((id) => id !== offerId) : [...prev, offerId];
      queryClient.setQueryData(["favorites", user?.id], next);
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        queryClient.setQueryData(["favorites", user?.id], context.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites", user?.id] });
    },
  });
}
