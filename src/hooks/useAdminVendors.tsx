import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";

type VendorStatus = Database["public"]["Enums"]["vendor_status"];

export function useAdminVendors() {
  const queryClient = useQueryClient();

  const vendorsQuery = useQuery({
    queryKey: ["admin-vendors"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_vendors");
      if (error) throw error;
      const rows = (data ?? []) as Tables<"vendors">[];
      return [...rows].sort((a, b) =>
        (b.created_at ?? "").localeCompare(a.created_at ?? "")
      );
    },

  });

  const updateStatus = useMutation({
    mutationFn: async ({ vendorId, status }: { vendorId: string; status: VendorStatus }) => {
      const { data, error } = await supabase
        .from("vendors")
        .update({ status })
        .eq("id", vendorId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-vendors"] });
    },
  });

  return {
    vendors: vendorsQuery.data ?? [],
    isLoading: vendorsQuery.isLoading,
    updateStatus,
  };
}
