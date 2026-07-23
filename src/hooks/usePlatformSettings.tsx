import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PlatformSettings {
  monthly_admin_fee: number;
  how_to_use_video_url?: string;
  how_to_use_manual_url?: string;
}

export function usePlatformSettings() {
  return useQuery({
    queryKey: ["platform-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings" as any)
        .select("monthly_admin_fee, how_to_use_video_url, how_to_use_manual_url")
        .eq("id", true)
        .maybeSingle();
      if (error) throw error;
      return (data as PlatformSettings | null) ?? { monthly_admin_fee: 0 };
    },
  });
}

export function useUpdatePlatformSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: Partial<PlatformSettings>) => {
      const { error } = await supabase
        .from("platform_settings" as any)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", true);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["platform-settings"] }),
  });
}

export function useUpdateMonthlyAdminFee() {
  const update = useUpdatePlatformSettings();
  return {
    ...update,
    mutate: (fee: number, options?: any) => update.mutate({ monthly_admin_fee: fee }, options)
  };
}
