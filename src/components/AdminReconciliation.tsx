import { useState } from "react";
import { useReconciliation } from "@/hooks/useReconciliation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  RefreshCcw, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight, 
  ChevronDown,
  Calendar
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function AdminReconciliation() {
  const { reports, runReconciliation } = useReconciliation();
  const [expandedReport, setExpandedReport] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold font-display">Reconciliação Financeira</h3>
          <p className="text-sm text-muted-foreground">
            Compare o saldo das carteiras com o histórico de transações para identificar divergências.
          </p>
        </div>
        <Button 
          onClick={() => runReconciliation.mutate()} 
          disabled={runReconciliation.isPending}
          className="gap-2"
        >
          <RefreshCcw className={`h-4 w-4 ${runReconciliation.isPending ? 'animate-spin' : ''}`} />
          Executar Nova Análise
        </Button>
      </div>

      <div className="grid gap-4">
        {reports.isLoading ? (
          <div className="flex justify-center py-12">
            <RefreshCcw className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : reports.data?.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckCircle2 className="h-12 w-12 text-muted-foreground/20 mb-4" />
              <p className="text-muted-foreground font-medium">Nenhum relatório gerado ainda.</p>
            </CardContent>
          </Card>
        ) : (
          reports.data?.map((report) => (
            <Card key={report.id} className={report.total_discrepancies > 0 ? "border-destructive/50" : ""}>
              <CardHeader 
                className="flex flex-row items-center justify-between py-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setExpandedReport(expandedReport === report.id ? null : report.id)}
              >
                <div className="flex items-center gap-4">
                  {expandedReport === report.id ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  <div className="flex flex-col">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {format(new Date(report.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                    </CardTitle>
                    <span className="text-xs text-muted-foreground">ID: {report.id.split('-')[0]}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {report.total_discrepancies > 0 ? (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {report.total_discrepancies} divergências
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-success border-success/30 bg-success/5 gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Consistente
                    </Badge>
                  )}
                </div>
              </CardHeader>
              
              {expandedReport === report.id && (
                <CardContent className="pt-0">
                  <div className="mt-4 border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead>Usuário</TableHead>
                          <TableHead>Saldo Atual</TableHead>
                          <TableHead>Saldo Calculado</TableHead>
                          <TableHead>Diferença</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.isArray(report.discrepancies) && (report.discrepancies as any[]).length > 0 ? (
                          (report.discrepancies as any[]).map((d, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-medium">
                                <div>{d.user_name}</div>
                                <div className="text-[10px] text-muted-foreground uppercase">{d.user_id.split('-')[0]}</div>
                              </TableCell>
                              <TableCell>R$ {d.current_balance.toFixed(2)}</TableCell>
                              <TableCell>R$ {d.calculated_balance.toFixed(2)}</TableCell>
                              <TableCell className="text-destructive font-bold">
                                R$ {d.diff.toFixed(2)}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                              Nenhuma divergência de saldo encontrada neste relatório.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
