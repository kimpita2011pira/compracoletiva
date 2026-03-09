import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useVendor } from "@/hooks/useVendor";
import { useToast } from "@/hooks/use-toast";
import { useBrazilLocations } from "@/hooks/useBrazilLocations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Store } from "lucide-react";
import { z } from "zod";

const vendorSchema = z.object({
  company_name: z.string().trim().min(2, "Nome da empresa deve ter pelo menos 2 caracteres").max(120, "Máximo 120 caracteres"),
  cnpj: z.string().trim().regex(/^(\d{11}|\d{3}\.\d{3}\.\d{3}-\d{2}|\d{14}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})?$/, "CPF ou CNPJ inválido"),
  state: z.string().min(2, "Selecione um estado"),
  city: z.string().min(2, "Selecione uma cidade"),
  description: z.string().trim().max(500, "Máximo 500 caracteres").optional(),
});

const VendorOnboarding = () => {
  const [companyName, setCompanyName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { registerVendor } = useVendor();
  const { toast } = useToast();
  const navigate = useNavigate();
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

    try {
      await registerVendor.mutateAsync(result.data as { company_name: string; cnpj: string; city: string; description: string });
      toast({ title: "Empresa cadastrada!", description: "Aguarde a aprovação do administrador." });
      navigate("/vendor");
    } catch (err: any) {
      toast({ title: "Erro ao cadastrar", description: err.message, variant: "destructive" });
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
                    // CPF: 000.000.000-00
                    masked = digits
                      .replace(/(\d{3})(\d)/, "$1.$2")
                      .replace(/(\d{3})(\d)/, "$1.$2")
                      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
                  } else {
                    // CNPJ: 00.000.000/0000-00
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
              <Label htmlFor="city">Cidade *</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex: São Paulo"
                maxLength={100}
                required
              />
              {errors.city && <p className="text-sm text-destructive">{errors.city}</p>}
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
