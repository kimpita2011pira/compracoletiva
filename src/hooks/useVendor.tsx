import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export function useVendor() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const vendorQuery = useQuery({
    queryKey: ["vendor", user?.id],
    queryFn: async () => {
      if (!user) return null;
      try {
        console.log("Fetching vendor for user:", user.id);
        const { data, error } = await supabase
          .from("vendors")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        if (error) {
          console.error("Vendor fetch error:", error);
          throw error;
        }
        console.log("Vendor data received:", data);
        return data as Tables<"vendors"> | null;
      } catch (err) {
        console.error("Vendor query failed:", err);
        throw err;
      }
    },
    enabled: !!user,
    retry: 1,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const registerVendor = useMutation({
    mutationFn: async (input: { company_name: string; cnpj: string; description: string }) => {
      if (!user) throw new Error("Not authenticated");
      const payload: TablesInsert<"vendors"> = {
        user_id: user.id,
        company_name: input.company_name.trim(),
        cnpj: input.cnpj.trim() || null,
        description: input.description.trim() || null,
      };
      const { data, error } = await supabase.from("vendors").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor", user?.id] });
    },
  });

  return {
    vendor: vendorQuery.data ?? null,
    isLoading: vendorQuery.isLoading,
    registerVendor,
  };
}
