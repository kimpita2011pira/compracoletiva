import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdminVendors } from "@/hooks/useAdminVendors";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, CheckCircle, XCircle, Clock, Store, Building2 } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";

type VendorStatus = Database["public"]["Enums"]["vendor_status"];

const statusConfig: Record<VendorStatus, { label: string; color: string; icon: React.ReactNode }> = {
  PENDENTE: { label: "Pendente", color: "bg-warning/15 text-warning-foreground border-warning/30", icon: <Clock className="h-4 w-4" /> },
  APROVADO: { label: "Aprovado", color: "bg-success/15 text-success border-success/30", icon: <CheckCircle className="h-4 w-4" /> },
  REJEITADO: { label: "Rejeitado", color: "bg-destructive/15 text-destructive border-destructive/30", icon: <XCircle className="h-4 w-4" /> },
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { vendors, isLoading, updateStatus } = useAdminVendors();

  const pending = vendors.filter((v) => v.status === "PENDENTE");
  const approved = vendors.filter((v) => v.status === "APROVADO");
  const rejected = vendors.filter((v) => v.status === "REJEITADO");

  const handleStatusChange = (vendorId: string, status: VendorStatus) => {
    updateStatus.mutate(
      { vendorId, status },
      {
        onSuccess: () => toast.success(`Vendedor ${status === "APROVADO" ? "aprovado" : "rejeitado"} com sucesso!`),
        onError: (err) => toast.error(`Erro: ${err.message}`),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-display text-xl font-bold text-primary">🛡️ Painel Admin</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            Sair
          </Button>
        </div>
      </header>

      <main className="container py-8">
        {/* KPI cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <KpiCard label="Pendentes" value={pending.length} icon={<Clock className="h-5 w-5" />} color="warning" />
          <KpiCard label="Aprovados" value={approved.length} icon={<CheckCircle className="h-5 w-5" />} color="success" />
          <KpiCard label="Rejeitados" value={rejected.length} icon={<XCircle className="h-5 w-5" />} color="destructive" />
        </div>

        {/* Vendor tabs */}
        <Tabs defaultValue="pendente" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pendente" className="gap-2">
              <Clock className="h-4 w-4" /> Pendentes ({pending.length})
            </TabsTrigger>
            <TabsTrigger value="aprovado" className="gap-2">
              <CheckCircle className="h-4 w-4" /> Aprovados ({approved.length})
            </TabsTrigger>
            <TabsTrigger value="rejeitado" className="gap-2">
              <XCircle className="h-4 w-4" /> Rejeitados ({rejected.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pendente">
            {pending.length === 0 ? (
              <EmptyState message="Nenhum vendedor pendente de aprovação" />
            ) : (
              <div className="space-y-4">
                {pending.map((v) => (
                  <VendorCard key={v.id} vendor={v} onApprove={() => handleStatusChange(v.id, "APROVADO")} onReject={() => handleStatusChange(v.id, "REJEITADO")} isPending />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="aprovado">
            {approved.length === 0 ? (
              <EmptyState message="Nenhum vendedor aprovado ainda" />
            ) : (
              <div className="space-y-4">
                {approved.map((v) => (
                  <VendorCard key={v.id} vendor={v} onReject={() => handleStatusChange(v.id, "REJEITADO")} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="rejeitado">
            {rejected.length === 0 ? (
              <EmptyState message="Nenhum vendedor rejeitado" />
            ) : (
              <div className="space-y-4">
                {rejected.map((v) => (
                  <VendorCard key={v.id} vendor={v} onApprove={() => handleStatusChange(v.id, "APROVADO")} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function KpiCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  const colorMap: Record<string, string> = {
    warning: "bg-warning/10 text-warning-foreground",
    success: "bg-success/10 text-success",
    destructive: "bg-destructive/10 text-destructive",
  };
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <div className={`rounded-lg p-2 ${colorMap[color]}`}>{icon}</div>
      </div>
      <p className="mt-2 font-display text-3xl font-bold">{value}</p>
    </div>
  );
}

function VendorCard({
  vendor,
  onApprove,
  onReject,
  isPending,
}: {
  vendor: Tables<"vendors">;
  onApprove?: () => void;
  onReject?: () => void;
  isPending?: boolean;
}) {
  const cfg = statusConfig[vendor.status];
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold">{vendor.company_name}</h3>
              {vendor.cnpj && <p className="text-sm text-muted-foreground">CNPJ: {vendor.cnpj}</p>}
            </div>
          </div>
          {vendor.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{vendor.description}</p>
          )}
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cfg.color}>
              {cfg.icon}
              <span className="ml-1">{cfg.label}</span>
            </Badge>
            <span className="text-xs text-muted-foreground">
              Cadastrado em {new Date(vendor.created_at).toLocaleDateString("pt-BR")}
            </span>
          </div>
        </div>

        <div className="flex gap-2 sm:flex-col">
          {(isPending || vendor.status === "REJEITADO") && onApprove && (
            <Button size="sm" onClick={onApprove} className="gap-1.5">
              <CheckCircle className="h-4 w-4" /> Aprovar
            </Button>
          )}
          {(isPending || vendor.status === "APROVADO") && onReject && (
            <Button size="sm" variant="destructive" onClick={onReject} className="gap-1.5">
              <XCircle className="h-4 w-4" /> Rejeitar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 py-16">
      <Store className="mb-3 h-10 w-10 text-muted-foreground/50" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}
