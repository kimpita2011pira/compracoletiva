import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ReconciliationReport {
  id: string;
  created_at: string;
  discrepancies: any;
  total_discrepancies: number;
  status: 'pending' | 'resolved';
}

export function useReconciliation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const reports = useQuery({
    queryKey: ["reconciliation-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reconciliation_reports" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ReconciliationReport[];
    },
  });

  const runReconciliation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("run_wallet_reconciliation" as any);
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
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: "Falha ao executar reconciliação: " + error.message,
        variant: "destructive",
      });
    },
  });

  return { reports, runReconciliation };
}
