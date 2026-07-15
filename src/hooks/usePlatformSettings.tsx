import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function usePlatformSettings() {
  return useQuery({
    queryKey: ["platform-settings"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("platform_settings")
        .select("monthly_admin_fee")
        .eq("id", true)
        .maybeSingle();
      if (error) throw error;
      return (data as { monthly_admin_fee: number } | null) ?? { monthly_admin_fee: 0 };
    },
  });
}

export function useUpdateMonthlyAdminFee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (fee: number) => {
      const { error } = await (supabase as any)
        .from("platform_settings")
        .update({ monthly_admin_fee: fee, updated_at: new Date().toISOString() })
        .eq("id", true);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["platform-settings"] }),
  });
}
