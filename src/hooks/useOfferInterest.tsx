import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useOfferInterest(offerId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: hasInterest, isLoading } = useQuery({
    queryKey: ["offer-interest", offerId, user?.id],
    enabled: !!offerId && !!user,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("offer_interests")
        .select("*", { count: "exact", head: true })
        .eq("offer_id", offerId!)
        .eq("user_id", user!.id);
      if (error) throw error;
      return (count ?? 0) > 0;
    },
  });

  const { data: interestCount } = useQuery({
    queryKey: ["offer-interest-count", offerId],
    enabled: !!offerId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("offer_interests")
        .select("*", { count: "exact", head: true })
        .eq("offer_id", offerId!);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const toggle = useMutation({
    mutationFn: async () => {
      if (!user || !offerId) throw new Error("Login necessário");

      if (hasInterest) {
        const { error } = await supabase
          .from("offer_interests")
          .delete()
          .eq("offer_id", offerId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("offer_interests")
          .insert({ offer_id: offerId, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offer-interest", offerId] });
      queryClient.invalidateQueries({ queryKey: ["offer-interest-count", offerId] });
    },
  });

  return { hasInterest: !!hasInterest, isLoading, interestCount: interestCount ?? 0, toggle };
}
