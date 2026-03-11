import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Store, ShieldCheck } from "lucide-react";
import { z } from "zod";

const vendorSchema = z.object({
  company_name: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(120),
  cnpj: z.string().trim().regex(/^(\d{11}|\d{3}\.\d{3}\.\d{3}-\d{2}|\d{14}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})?$/, "CPF ou CNPJ inválido"),
  state: z.string().min(2, "Selecione um estado"),
  city: z.string().min(2, "Selecione uma cidade"),
  description: z.string().trim().max(500).optional(),
});

export function BecomeVendorCard() {
  const { user } = useAuth();
  const { registerVendor } = useVendor();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const { states, cities, loadingStates, loadingCities } = useBrazilLocations(selectedState);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = vendorSchema.safeParse({ company_name: companyName, cnpj, state: selectedState, city: selectedCity, description });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    if (!user) return;
    setSubmitting(true);

    try {
      // 1. Add VENDEDOR role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: user.id, role: "VENDEDOR" as any });

      if (roleError && !roleError.message.includes("duplicate")) {
        throw roleError;
      }

      // 2. Create vendor record (PENDENTE)
      await registerVendor.mutateAsync({
        company_name: result.data.company_name,
        cnpj: result.data.cnpj,
        city: result.data.city,
        description: result.data.description || "",
      });

      toast({
        title: "Solicitação enviada! 🎉",
        description: "Aguarde a aprovação do administrador para começar a vender.",
      });

      // Reload to update roles
      window.location.href = "/vendor";
    } catch (err: any) {
      toast({ title: "Erro ao solicitar", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <Card className="border-2 border-dashed border-secondary/40 shadow-lg">
        <CardContent className="flex flex-col items-center gap-4 py-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary/10">
            <Store className="h-7 w-7 text-secondary" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-bold">Quer vender na plataforma?</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Solicite autorização ao administrador para se tornar um vendedor e começar a criar ofertas.
            </p>
          </div>
          <Button onClick={() => setOpen(true)} className="mt-2" size="lg">
            <Store className="mr-2 h-4 w-4" />
            Quero ser Vendedor
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-xl">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-xl bg-secondary/10">
          <ShieldCheck className="h-7 w-7 text-secondary" />
        </div>
        <CardTitle className="font-display text-xl">Solicitar Autorização de Vendedor</CardTitle>
        <CardDescription>
          Preencha os dados da sua empresa. O administrador analisará sua solicitação.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="become-company">Nome da Empresa / Razão Social *</Label>
            <Input
              id="become-company"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Ex: Padaria do João"
              maxLength={120}
              required
            />
            {errors.company_name && <p className="text-sm text-destructive">{errors.company_name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="become-cnpj">CPF ou CNPJ</Label>
            <Input
              id="become-cnpj"
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
              placeholder="000.000.000-00 ou 00.000.000/0000-00"
              maxLength={18}
            />
            {errors.cnpj && <p className="text-sm text-destructive">{errors.cnpj}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Estado *</Label>
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
              {errors.state && <p className="text-sm text-destructive">{errors.state}</p>}
            </div>
            <div className="space-y-2">
              <Label>Cidade *</Label>
              <Select value={selectedCity} onValueChange={setSelectedCity} disabled={!selectedState}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingCities ? "Carregando..." : "Selecione"} />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((c) => (
                    <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.city && <p className="text-sm text-destructive">{errors.city}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição da Empresa</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Conte um pouco sobre sua empresa e produtos..."
              maxLength={500}
              rows={3}
            />
            <p className="text-xs text-muted-foreground text-right">{description.length}/500</p>
          </div>

          <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
            <p>⏳ Após o envio, o administrador analisará sua solicitação. Você será notificado sobre a aprovação.</p>
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={submitting}>
              {submitting ? "Enviando..." : "Enviar Solicitação"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
