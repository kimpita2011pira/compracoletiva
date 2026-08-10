import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useReconciliation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const reports = useQuery({
    queryKey: ["reconciliation-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reconciliation_reports")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const runReconciliation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("run_wallet_reconciliation");
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reconciliation-reports"] });
      toast({
        title: "Sucesso!",
        description: "Rotina de reconciliação executada com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao executar reconciliação: " + error.message,
        variant: "destructive",
      });
    },
  });

  return { reports, runReconciliation };
}
