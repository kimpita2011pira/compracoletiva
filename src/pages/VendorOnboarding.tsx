import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useVendor } from "@/hooks/useVendor";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useBrazilLocations } from "@/hooks/useBrazilLocations";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Store } from "lucide-react";
import { z } from "zod";

// Valid Brazilian DDDs
const VALID_DDDS = new Set([
  "11","12","13","14","15","16","17","18","19",
  "21","22","24","27","28",
  "31","32","33","34","35","37","38",
  "41","42","43","44","45","46","47","48","49",
  "51","53","54","55",
  "61","62","63","64","65","66","67","68","69",
  "71","73","74","75","77","79",
  "81","82","83","84","85","86","87","88","89",
  "91","92","93","94","95","96","97","98","99",
]);

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

const whatsappSchema = z.string().refine((v) => {
  const digits = v.replace(/\D/g, "");
  return digits.length === 11 && VALID_DDDS.has(digits.slice(0, 2)) && digits[2] === "9";
}, "WhatsApp inválido. Use (DDD) 9XXXX-XXXX com DDD brasileiro válido.");

const vendorSchema = z.object({
  company_name: z.string().trim().min(2, "Nome da empresa deve ter pelo menos 2 caracteres").max(120, "Máximo 120 caracteres"),
  cnpj: z.string().trim().regex(/^(\d{11}|\d{3}\.\d{3}\.\d{3}-\d{2}|\d{14}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})?$/, "CPF ou CNPJ inválido"),
  whatsapp: whatsappSchema,
  state: z.string().min(2, "Selecione um estado"),
  city: z.string().min(2, "Selecione uma cidade"),
  description: z.string().trim().max(500, "Máximo 500 caracteres").optional(),
});

const VendorOnboarding = () => {
  const { user } = useAuth();
  const [companyName, setCompanyName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { registerVendor } = useVendor();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { states, cities, loadingStates, loadingCities } = useBrazilLocations(selectedState);

  // Pre-fill WhatsApp from existing profile if available
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("whatsapp")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.whatsapp) setWhatsapp(formatPhone(data.whatsapp));
      });
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = vendorSchema.safeParse({ company_name: companyName, cnpj, whatsapp, state: selectedState, city: selectedCity, description });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      // Persist WhatsApp on profile so it's available for notifications
      if (user) {
        const { error: profileErr } = await supabase
          .from("profiles")
          .update({ whatsapp: result.data.whatsapp })
          .eq("id", user.id);
        if (profileErr) throw profileErr;
      }

      await registerVendor.mutateAsync({
        company_name: result.data.company_name,
        cnpj: result.data.cnpj,
        city: result.data.city,
        description: result.data.description ?? "",
      });
      toast({ title: "Empresa cadastrada!", description: "Aguarde a aprovação do administrador." });
      navigate("/vendor");
    } catch (err: any) {
      toast({ title: "Erro no cadastro", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <Card className="w-full max-w-lg border-0 shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-xl bg-secondary/10">
            <Store className="h-7 w-7 text-secondary" />
          </div>
          <CardTitle className="font-display text-xl">Cadastrar Empresa</CardTitle>
          <CardDescription>Preencha os dados da sua empresa para começar a vender</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Voltar
            </button>

            <div className="space-y-2">
              <Label htmlFor="company_name">Nome da Empresa *</Label>
              <Input
                id="company_name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Ex: Padaria do João"
                maxLength={120}
                required
              />
              {errors.company_name && <p className="text-sm text-destructive">{errors.company_name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cnpj">CPF ou CNPJ</Label>
              <Input
                id="cnpj"
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

            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp *</Label>
              <Input
                id="whatsapp"
                value={whatsapp}
                onChange={(e) => setWhatsapp(formatPhone(e.target.value))}
                placeholder="(00) 00000-0000"
                maxLength={15}
                required
              />
              <p className="text-[11px] text-muted-foreground">
                Obrigatório para receber notificações de pedidos, validação de ofertas e saques.
              </p>
              {errors.whatsapp && <p className="text-sm text-destructive">{errors.whatsapp}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="state">Estado *</Label>
                <Select 
                  value={selectedState} 
                  onValueChange={(v) => { 
                    console.log("Selecionando estado:", v);
                    setSelectedState(v); 
                    setSelectedCity(""); 
                  }}
                >
                  <SelectTrigger id="state">
                    <SelectValue placeholder={loadingStates ? "Carregando..." : "Selecione"} />
                  </SelectTrigger>
                  <SelectContent>
                    {states && states.length > 0 ? (
                      states.map((s) => (
                        <SelectItem key={s.sigla} value={s.sigla}>{s.nome}</SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        {loadingStates ? "Carregando estados..." : "Nenhum estado encontrado"}
                      </div>
                    )}
                  </SelectContent>
                </Select>
                {errors.state && <p className="text-sm text-destructive">{errors.state}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Cidade *</Label>
                <Select value={selectedCity} onValueChange={setSelectedCity} disabled={!selectedState || loadingCities}>
                  <SelectTrigger id="city">
                    <SelectValue placeholder={loadingCities ? "Carregando..." : "Selecione"} />
                  </SelectTrigger>
                  <SelectContent>
                    {cities && cities.length > 0 ? (
                      cities.map((c) => (
                        <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        {loadingCities ? "Carregando cidades..." : "Selecione um estado primeiro"}
                      </div>
                    )}
                  </SelectContent>
                </Select>
                {errors.city && <p className="text-sm text-destructive">{errors.city}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição da Empresa</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Conte um pouco sobre sua empresa e produtos..."
                maxLength={500}
                rows={4}
              />
              <p className="text-xs text-muted-foreground text-right">{description.length}/500</p>
              {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
            </div>

            <Button
              type="submit"
              className="w-full text-base font-bold"
              size="lg"
              disabled={registerVendor.isPending}
            >
              {registerVendor.isPending ? "Cadastrando..." : "Cadastrar Empresa"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default VendorOnboarding;
