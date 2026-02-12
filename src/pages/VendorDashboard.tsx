import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useVendor } from "@/hooks/useVendor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Store, Clock, CheckCircle, XCircle, Package, Plus } from "lucide-react";

const statusConfig = {
  PENDENTE: { label: "Pendente", icon: Clock, variant: "secondary" as const, color: "text-yellow-600", bg: "bg-yellow-50" },
  APROVADO: { label: "Aprovado", icon: CheckCircle, variant: "default" as const, color: "text-green-600", bg: "bg-green-50" },
  REJEITADO: { label: "Rejeitado", icon: XCircle, variant: "destructive" as const, color: "text-destructive", bg: "bg-red-50" },
};

const VendorDashboard = () => {
  const { user } = useAuth();
  const { vendor, isLoading } = useVendor();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // No vendor record yet → redirect to onboarding
  if (!vendor) {
    navigate("/vendor/onboarding", { replace: true });
    return null;
  }

  const status = statusConfig[vendor.status];
  const StatusIcon = status.icon;
  const isApproved = vendor.status === "APROVADO";
  const isPending = vendor.status === "PENDENTE";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="font-display text-xl font-bold text-primary">
              <Store className="mr-2 inline h-5 w-5" />
              Área do Vendedor
            </h1>
          </div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
      </header>

      <div className="container max-w-3xl py-8 space-y-6">
        {/* Company Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Store className="h-5 w-5 text-secondary" />
              {vendor.company_name}
            </CardTitle>
            <CardDescription>
              {vendor.cnpj ? `CNPJ: ${vendor.cnpj}` : "CNPJ não informado"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {vendor.description && (
              <p className="text-sm text-muted-foreground">{vendor.description}</p>
            )}

            {/* Status Banner */}
            <div className={`rounded-lg p-4 ${status.bg} flex items-start gap-3`}>
              <StatusIcon className={`h-5 w-5 mt-0.5 ${status.color}`} />
              <div>
                <p className={`font-semibold ${status.color}`}>
                  {isPending && "Cadastro em análise"}
                  {isApproved && "Empresa aprovada!"}
                  {vendor.status === "REJEITADO" && "Cadastro rejeitado"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {isPending && "Seu cadastro está sendo analisado pela equipe. Você será notificado quando for aprovado."}
                  {isApproved && "Sua empresa está ativa! Você pode criar ofertas para seus clientes."}
                  {vendor.status === "REJEITADO" && "Entre em contato com o suporte para mais informações."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions for Approved Vendors */}
        {isApproved && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="cursor-pointer border-2 border-transparent transition-all hover:border-primary/30 hover:shadow-md">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-bold">Criar Oferta</h3>
                  <p className="text-sm text-muted-foreground">Nova oferta coletiva</p>
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer border-2 border-transparent transition-all hover:border-secondary/30 hover:shadow-md">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/10">
                  <Package className="h-6 w-6 text-secondary" />
                </div>
                <div>
                  <h3 className="font-display font-bold">Minhas Ofertas</h3>
                  <p className="text-sm text-muted-foreground">Gerencie suas ofertas</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Pending state - helpful info */}
        {isPending && (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center text-muted-foreground">
              <Clock className="mx-auto mb-3 h-10 w-10 text-yellow-500" />
              <p className="font-display font-bold text-foreground">Aguardando aprovação</p>
              <p className="mt-1 text-sm">
                Enquanto isso, prepare suas ofertas! Assim que aprovado, você poderá publicá-las imediatamente.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default VendorDashboard;
