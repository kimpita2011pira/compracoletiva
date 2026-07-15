import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type AdminFeeStatus =
  | { kind: "hidden" } // vendor/admin/franchisee or fee = 0
  | { kind: "exempt"; fee: number }
  | { kind: "charged"; fee: number; month: string; chargedAt: string }
  | { kind: "pending_no_balance"; fee: number; balance: number }
  | { kind: "scheduled"; fee: number };

export function useAdminFeeStatus() {
  const { user, roles } = useAuth();
  return useQuery({
    queryKey: ["admin-fee-status", user?.id, roles],
    enabled: !!user?.id,
    queryFn: async (): Promise<AdminFeeStatus> => {
      if (!user?.id) return { kind: "hidden" };
      // Only buyers see this
      const isBuyer =
        roles?.includes("CLIENTE") &&
        !roles.includes("VENDEDOR") &&
        !roles.includes("ADMIN") &&
        !roles.includes("FRANQUEADO");
      if (!isBuyer) return { kind: "hidden" };

      const [settingsRes, profileRes, walletRes] = await Promise.all([
        (supabase as any).from("platform_settings").select("monthly_admin_fee").eq("id", true).maybeSingle(),
        (supabase as any).from("profiles").select("admin_fee_exempt").eq("id", user.id).maybeSingle(),
        supabase.from("wallets").select("balance").eq("user_id", user.id).maybeSingle(),
      ]);

      const fee = Number(settingsRes.data?.monthly_admin_fee ?? 0);
      if (!fee || fee <= 0) return { kind: "hidden" };
      if (profileRes.data?.admin_fee_exempt) return { kind: "exempt", fee };

      const now = new Date();
      const month = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const { data: charge } = await (supabase as any)
        .from("user_admin_fee_charges")
        .select("month, created_at")
        .eq("user_id", user.id)
        .eq("month", month)
        .maybeSingle();

      if (charge) return { kind: "charged", fee, month: charge.month, chargedAt: charge.created_at };

      const balance = Number(walletRes.data?.balance ?? 0);
      if (balance < fee) return { kind: "pending_no_balance", fee, balance };
      return { kind: "scheduled", fee };
    },
    staleTime: 30_000,
  });
}

export function useAdminFeeCharges(month?: string, search?: string) {
  return useQuery({
    queryKey: ["admin-fee-charges", month ?? "all", search ?? ""],
    queryFn: async () => {
      let q = (supabase as any)
        .from("user_admin_fee_charges")
        .select("id, user_id, month, amount, created_at, profiles:profiles!inner(name, city, state, admin_fee_exempt)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (month) q = q.eq("month", month);
      const { data, error } = await q;
      if (error) throw error;
      const rows = (data as any[]) ?? [];
      const s = (search ?? "").trim().toLowerCase();
      return s ? rows.filter((r) => (r.profiles?.name ?? "").toLowerCase().includes(s)) : rows;
    },
  });
}

export function useAdminFeeMembers(search?: string) {
  return useQuery({
    queryKey: ["admin-fee-members", search ?? ""],
    queryFn: async () => {
      let q = (supabase as any)
        .from("profiles")
        .select("id, name, city, state, admin_fee_exempt")
        .order("name")
        .limit(500);
      if (search && search.trim()) q = q.ilike("name", `%${search.trim()}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });
}

export function useToggleAdminFeeExempt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, exempt }: { userId: string; exempt: boolean }) => {
      const { error } = await (supabase as any)
        .from("profiles")
        .update({ admin_fee_exempt: exempt })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-fee-members"] });
      qc.invalidateQueries({ queryKey: ["admin-fee-charges"] });
      qc.invalidateQueries({ queryKey: ["admin-fee-status"] });
    },
  });
}
