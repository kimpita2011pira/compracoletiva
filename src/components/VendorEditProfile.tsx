import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useVendor } from "@/hooks/useVendor";
import { useToast } from "@/hooks/use-toast";
import { useBrazilLocations } from "@/hooks/useBrazilLocations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Save, X } from "lucide-react";

export function VendorEditProfile() {
  const { user } = useAuth();
  const { vendor, updateVendor } = useVendor();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);

  const [companyName, setCompanyName] = useState(vendor?.company_name || "");
  const [cnpj, setCnpj] = useState(vendor?.cnpj || "");
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState(vendor?.city || "");
  const [description, setDescription] = useState(vendor?.description || "");
  const [submitting, setSubmitting] = useState(false);
  const { states, cities, loadingStates, loadingCities } = useBrazilLocations(selectedState);

  if (!vendor) return null;

  const handleStartEdit = () => {
    setCompanyName(vendor.company_name);
    setCnpj(vendor.cnpj || "");
    setSelectedCity(vendor.city || "");
    setDescription(vendor.description || "");
    setEditing(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !vendor) return;
    setSubmitting(true);

    try {
      // Build previous_data with only fields that changed
      const changes: Record<string, { de: string; para: string }> = {};
      if (companyName.trim() !== vendor.company_name) {
        changes.company_name = { de: vendor.company_name, para: companyName.trim() };
      }
      if ((cnpj.trim() || null) !== (vendor.cnpj || null)) {
        changes.cnpj = { de: vendor.cnpj || "", para: cnpj.trim() };
      }
      if ((selectedCity.trim() || null) !== (vendor.city || null)) {
        changes.city = { de: vendor.city || "", para: selectedCity.trim() };
      }
      if ((description.trim() || null) !== (vendor.description || null)) {
        changes.description = { de: vendor.description || "", para: description.trim() };
      }

      if (Object.keys(changes).length === 0) {
        toast({ title: "Nenhuma alteração detectada" });
        setEditing(false);
        setSubmitting(false);
        return;
      }

      const { error } = await supabase
        .from("vendors")
        .update({
          company_name: companyName.trim(),
          cnpj: cnpj.trim() || null,
          city: selectedCity.trim() || null,
          description: description.trim() || null,
          status: "PENDENTE" as any,
          previous_data: changes as any,
        })
        .eq("id", vendor.id);

      if (error) throw error;

      // Invalidate vendor query
      updateVendor?.();

      toast({
        title: "Alteração enviada! ✏️",
        description: "Seu cadastro voltou para análise. Aguarde a aprovação do administrador.",
      });
      setEditing(false);
    } catch (err: any) {
      toast({ title: "Erro ao atualizar", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (!editing) {
    return (
      <Button variant="outline" size="sm" className="gap-1.5" onClick={handleStartEdit}>
        <Pencil className="h-3.5 w-3.5" /> Editar Cadastro
      </Button>
    );
  }

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <Pencil className="h-4 w-4 text-primary" />
          Editar Dados do Cadastro
        </CardTitle>
        <CardDescription>
          Ao salvar, seu cadastro voltará para análise do administrador. Os campos alterados serão destacados.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome da Empresa / Razão Social *</Label>
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              maxLength={120}
              required
            />
            {companyName.trim() !== vendor.company_name && (
              <p className="text-xs text-warning-foreground">Alterado (era: {vendor.company_name})</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>CPF ou CNPJ</Label>
            <Input
              value={cnpj}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "");
                let masked = digits;
                if (digits.length <= 11) {
                  masked = digits
                    .replace(/(\d{3})(\d)/, "$1.$2")
                    .replace(/(\d{3})(\d)/, "$1.$2")
                    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
                } else {
                  masked = digits
                    .slice(0, 14)
                    .replace(/(\d{2})(\d)/, "$1.$2")
                    .replace(/(\d{3})(\d)/, "$1.$2")
                    .replace(/(\d{3})(\d)/, "$1/$2")
                    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
                }
                setCnpj(masked);
              }}
              maxLength={18}
            />
            {(cnpj.trim() || "") !== (vendor.cnpj || "") && (
              <p className="text-xs text-warning-foreground">Alterado (era: {vendor.cnpj || "vazio"})</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={selectedState} onValueChange={(v) => { setSelectedState(v); setSelectedCity(""); }}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingStates ? "Carregando..." : "Selecione"} />
                </SelectTrigger>
                <SelectContent>
                  {states.map((s) => (
                    <SelectItem key={s.sigla} value={s.sigla}>{s.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cidade</Label>
              <Select value={selectedCity} onValueChange={setSelectedCity} disabled={!selectedState}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingCities ? "Carregando..." : selectedCity || "Selecione"} />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((c) => (
                    <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(selectedCity.trim() || "") !== (vendor.city || "") && (
                <p className="text-xs text-warning-foreground">Alterado (era: {vendor.city || "vazio"})</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
            />
            <p className="text-xs text-muted-foreground text-right">{description.length}/500</p>
            {(description.trim() || "") !== (vendor.description || "") && (
              <p className="text-xs text-warning-foreground">Alterado</p>
            )}
          </div>

          <div className="rounded-lg bg-warning/10 p-3 text-sm text-warning-foreground">
            <p>⚠️ Ao salvar, seu status voltará para <strong>PENDENTE</strong> até o administrador aprovar novamente.</p>
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setEditing(false)}>
              <X className="mr-1 h-4 w-4" /> Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={submitting}>
              <Save className="mr-1 h-4 w-4" />
              {submitting ? "Salvando..." : "Salvar e Reenviar"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
