import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type WalletTransaction = Tables<"wallet_transactions">;

export function useWallet() {
  return useQuery({
    queryKey: ["wallet"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useWalletTransactions() {
  return useQuery({
    queryKey: ["wallet-transactions"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // First get wallet id
      const { data: wallet } = await supabase
        .from("wallets")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!wallet) return [];

      const { data, error } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("wallet_id", wallet.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as WalletTransaction[];
    },
  });
}
