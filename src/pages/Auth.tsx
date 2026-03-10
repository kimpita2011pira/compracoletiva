import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ShoppingBag, Store, ArrowLeft } from "lucide-react";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";
import { useBrazilLocations } from "@/hooks/useBrazilLocations";
import { PromoBanner } from "@/components/PromoBanner";

type AuthMode = "login" | "register";
type RoleChoice = "CLIENTE" | "VENDEDOR" | null;

const Auth = () => {
  const [mode, setMode] = useState<AuthMode>("login");
  const [roleChoice, setRoleChoice] = useState<RoleChoice>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { states, cities, loadingStates, loadingCities } = useBrazilLocations(selectedState);

  const formatPhone = useCallback((value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits.length ? `(${digits}` : "";
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }, []);

  const isPhoneValid = (value: string) => {
    if (!value) return true; // optional field
    const digits = value.replace(/\D/g, "");
    return digits.length === 10 || digits.length === 11;
  };

  const [phoneError, setPhoneError] = useState("");
  const [whatsappError, setWhatsappError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: "Erro ao entrar", description: error.message, variant: "destructive" });
    } else {
      navigate("/");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleChoice) return;
    if (password !== confirmPassword) {
      toast({ title: "Senhas não coincidem", description: "A confirmação de senha deve ser igual à senha.", variant: "destructive" });
      return;
    }
    // Validate phone formats
    const phoneValid = isPhoneValid(phone);
    const whatsappValid = isPhoneValid(whatsapp);
    setPhoneError(phoneValid ? "" : "Telefone deve ter 10 ou 11 dígitos");
    setWhatsappError(whatsappValid ? "" : "WhatsApp deve ter 10 ou 11 dígitos");
    if (!phoneValid || !whatsappValid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { name, phone, whatsapp, state: selectedState, city: selectedCity, role: roleChoice },
      },
    });
    setLoading(false);
    if (error) {
      toast({ title: "Erro no cadastro", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: "Cadastro realizado!",
        description: "Verifique seu email para confirmar a conta.",
      });
      setMode("login");
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      toast({
        title: "Informe seu e-mail",
        description: "Digite seu e-mail no campo acima para recuperar a senha.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);

    if (error) {
      toast({ title: "Erro ao enviar recuperação", description: error.message, variant: "destructive" });
      return;
    }

    toast({
      title: "E-mail enviado",
      description: "Confira sua caixa de entrada para redefinir sua senha.",
    });
  };

  // Step 1 of register: choose role
  if (mode === "register" && !roleChoice) {
    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <PromoBanner />
        <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="font-display text-4xl font-bold text-primary">🛒 Compra Coletiva</h1>
            <p className="mt-2 text-muted-foreground">Como você quer usar a plataforma?</p>
          </div>
          <div className="grid gap-4">
            <Card
              className="cursor-pointer border-2 transition-all hover:border-primary hover:shadow-lg"
              onClick={() => setRoleChoice("CLIENTE")}
            >
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                  <ShoppingBag className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold">Quero Comprar</h3>
                  <p className="text-sm text-muted-foreground">
                    Encontre ofertas incríveis com desconto em compra coletiva
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card
              className="cursor-pointer border-2 transition-all hover:border-secondary hover:shadow-lg"
              onClick={() => setRoleChoice("VENDEDOR")}
            >
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary/10">
                  <Store className="h-7 w-7 text-secondary" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold">Quero Vender</h3>
                  <p className="text-sm text-muted-foreground">
                    Crie ofertas coletivas e aumente suas vendas
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
          <p className="text-center text-sm text-muted-foreground">
            Já tem conta?{" "}
            <button onClick={() => setMode("login")} className="font-semibold text-primary hover:underline">
              Entrar
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <Card className="w-full max-w-md border-0 shadow-xl">
        <CardHeader className="text-center">
          <h1 className="font-display text-3xl font-bold text-primary">🛒 Compra Coletiva</h1>
          <CardTitle className="font-display text-xl">
            {mode === "login" ? "Entrar na sua conta" : "Criar sua conta"}
          </CardTitle>
          <CardDescription>
            {mode === "login"
              ? "Acesse suas ofertas e carteira"
              : roleChoice === "CLIENTE"
                ? "Cadastro de Comprador"
                : "Cadastro de Vendedor"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={mode === "login" ? handleLogin : handleRegister} className="space-y-4">
            {mode === "register" && (
              <>
                <button
                  type="button"
                  onClick={() => setRoleChoice(null)}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" /> Trocar perfil
                </button>
                <div className="space-y-2">
                  <Label htmlFor="name">Nome completo</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input id="phone" value={phone} onChange={(e) => { setPhone(formatPhone(e.target.value)); setPhoneError(""); }} placeholder="(00) 00000-0000" maxLength={15} />
                    {phoneError && <p className="text-xs text-destructive">{phoneError}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp">WhatsApp</Label>
                    <Input id="whatsapp" value={whatsapp} onChange={(e) => { setWhatsapp(formatPhone(e.target.value)); setWhatsappError(""); }} placeholder="(00) 00000-0000" maxLength={15} />
                    {whatsappError && <p className="text-xs text-destructive">{whatsappError}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="state">Estado</Label>
                    <Select value={selectedState} onValueChange={(v) => { setSelectedState(v); setSelectedCity(""); }}>
                      <SelectTrigger id="state">
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
                    <Label htmlFor="city">Cidade</Label>
                    <Select value={selectedCity} onValueChange={setSelectedCity} disabled={!selectedState}>
                      <SelectTrigger id="city">
                        <SelectValue placeholder={loadingCities ? "Carregando..." : "Selecione"} />
                      </SelectTrigger>
                      <SelectContent>
                        {cities.map((c) => (
                          <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              {mode === "register" && <PasswordStrengthIndicator password={password} />}
            </div>
            {mode === "register" && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-sm text-destructive">As senhas não coincidem</p>
                )}
              </div>
            )}
            {mode === "login" && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={loading}
                  className="text-sm font-semibold text-primary hover:underline disabled:opacity-50"
                >
                  Esqueci minha senha
                </button>
              </div>
            )}
            <Button type="submit" className="w-full text-base font-bold" size="lg" disabled={loading}>
              {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <>
                Não tem conta?{" "}
                <button onClick={() => setMode("register")} className="font-semibold text-primary hover:underline">
                  Criar conta
                </button>
              </>
            ) : (
              <>
                Já tem conta?{" "}
                <button onClick={() => { setMode("login"); setRoleChoice(null); }} className="font-semibold text-primary hover:underline">
                  Entrar
                </button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;

