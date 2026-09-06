import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AdminWalletRow {
  wallet_id: string;
  user_id: string;
  name: string | null;
  balance: number;
  updated_at: string;
  roles: string | null;
  company_name: string | null;
}

/**
 * Lista todas as carteiras (vendedores, franqueados e clientes) para o admin.
 * Atualiza automaticamente a cada 5 segundos para refletir créditos em tempo real.
 */
export function useAdminWallets() {
  return useQuery({
    queryKey: ["admin-wallets"],
    refetchInterval: 5000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_wallets" as never);
      if (error) throw error;
      return ((data ?? []) as unknown as AdminWalletRow[]).map((row) => ({
        ...row,
        balance: Number(row.balance ?? 0),
      }));
    },
  });
}

/** Saldo do caixa da plataforma, também com atualização automática. */
export function usePlatformWalletBalance() {
  return useQuery({
    queryKey: ["platform-wallet-balance"],
    refetchInterval: 5000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_wallet")
        .select("balance,updated_at")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data ? { balance: Number(data.balance ?? 0), updated_at: data.updated_at } : null;
    },
  });
}
