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
        .from("platform_settings")
        .select("monthly_admin_fee, how_to_use_video_url, how_to_use_manual_url")
        .eq("id", true)
        .maybeSingle();
      
      if (error) throw error;
      
      // Use cast to any then to PlatformSettings to bypass strict type checking on auto-gen client
      const result = (data as any) as PlatformSettings | null;
      return result ?? { monthly_admin_fee: 0 };
    },
  });
}

export function useUpdatePlatformSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: Partial<PlatformSettings>) => {
      const { error } = await supabase
        .from("platform_settings")
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
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
