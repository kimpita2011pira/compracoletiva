import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type WithdrawalRequest = {
  id: string;
  vendor_id: string;
  user_id: string;
  amount: number;
  pix_key: string;
  status: string;
  admin_note: string | null;
  created_at: string;
  processed_at: string | null;
};

export function useVendorWithdrawals() {
  return useQuery({
    queryKey: ["vendor-withdrawals"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("withdrawal_requests" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as WithdrawalRequest[];
    },
  });
}

export function useCreateWithdrawal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ vendorId, amount, pixKey }: { vendorId: string; amount: number; pixKey: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const { data, error } = await supabase
        .from("withdrawal_requests" as any)
        .insert({ vendor_id: vendorId, user_id: user.id, amount, pix_key: pixKey })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-withdrawals"] });
    },
  });
}

export function useAdminWithdrawals() {
  return useQuery({
    queryKey: ["admin-withdrawals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("withdrawal_requests" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as WithdrawalRequest[];
    },
  });
}

export function useProcessWithdrawal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, adminNote }: { id: string; status: "APROVADO" | "REJEITADO"; adminNote?: string }) => {
      const { error } = await supabase
        .from("withdrawal_requests" as any)
        .update({ status, admin_note: adminNote || null, processed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-withdrawals"] });
    },
  });
}
