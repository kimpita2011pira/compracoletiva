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
      return (data as any) as ReconciliationReport[];
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

  const runExternalReconciliation = useMutation({
    mutationFn: async () => {
      const { data, error: funcError } = await supabase.functions.invoke("mercadopago-reconciliation");
      if (funcError) throw funcError;

      const { discrepancies } = data;
      if (discrepancies.length === 0) return { empty: true };

      const { data: reportId, error: rpcError } = await supabase.rpc("run_external_reconciliation" as any, {
        p_discrepancies: discrepancies
      });
      if (rpcError) throw rpcError;
      
      return { reportId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["reconciliation-reports"] });
      toast({
        title: data.empty ? "Consistente!" : "Relatório Gerado!",
        description: data.empty 
          ? "Nenhuma divergência externa encontrada." 
          : "Foram encontradas divergências entre o Mercado Pago e o banco de dados.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro Externo",
        description: "Falha ao verificar Mercado Pago: " + error.message,
        variant: "destructive",
      });
    },
  });

  const testNotifications = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("test_commission_notification" as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Teste enviado!",
        description: "Uma transação de teste foi criada. Verifique suas notificações em alguns instantes.",
      });
    },
  });

  const fixOfferCredits = useMutation({
    mutationFn: async (offerId: string) => {
      const { data, error } = await supabase.rpc("fix_vendor_offer_credits" as any, {
        p_offer_id: offerId
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["reconciliation-reports"] });
        toast({
          title: "Sucesso!",
          description: `Vendedor creditado com R$ ${data.vendor_credited} e Plataforma com R$ ${data.platform_credited}.`,
        });
      } else {
        toast({
          title: "Aviso",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: "Falha ao corrigir créditos: " + error.message,
        variant: "destructive",
      });
    },
  });

  return { 
    reports, 
    runReconciliation, 
    runExternalReconciliation, 
    testNotifications,
    fixOfferCredits
  };
}
