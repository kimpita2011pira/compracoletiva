import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ShoppingBag, Store, ArrowLeft, ChevronsUpDown, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";
import { useBrazilLocations } from "@/hooks/useBrazilLocations";
import { PromoBanner } from "@/components/PromoBanner";
import { SEOHead } from "@/components/SEOHead";

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
  const [cityOpen, setCityOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
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
    if (!acceptedPrivacy) {
      toast({ title: "Aceite obrigatório", description: "Você precisa aceitar a Política de Privacidade para criar sua conta.", variant: "destructive" });
      return;
    }
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

  const stepKey = mode === "register" && !roleChoice ? "role-select" : mode === "register" ? `register-${roleChoice}` : "login";

  const pageVariants = {
    initial: { opacity: 0, y: 20, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const } },
    exit: { opacity: 0, y: -15, scale: 0.98, transition: { duration: 0.2, ease: "easeIn" as const } },
  };

  const staggerChildren = {
    animate: { transition: { staggerChildren: 0.06 } },
  };

  const childVariants = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <SEOHead
        title="Entrar ou criar conta"
        description="Acesse sua conta no Compra Coletiva ou cadastre-se gratuitamente para reservar ofertas em grupo na sua cidade."
        path="/auth"
      />
      <div className="sticky top-0 z-50">
        <PromoBanner />
      </div>
      <div className="flex flex-1 items-center justify-center p-3 sm:p-4">
        <AnimatePresence mode="wait">
          {mode === "register" && !roleChoice ? (
            <motion.div
              key="role-select"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="w-full max-w-md space-y-4 sm:space-y-6"
            >
              <motion.div variants={staggerChildren} initial="initial" animate="animate" className="space-y-4 sm:space-y-6">
                <motion.div variants={childVariants} className="text-center">
                  <img src="/logo-icon.png" alt="Compra Coletiva" className="mx-auto h-24 sm:h-32 w-auto object-contain" />
                  <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-2">Compra Coletiva</h1>
                  <p className="mt-1 text-lg sm:text-xl font-semibold text-primary tracking-wide">JUNTOS, PAGAMOS MENOS!</p>
                  <p className="mt-3 sm:mt-4 text-sm sm:text-base text-muted-foreground">Como você quer usar a plataforma?</p>
                </motion.div>
                <div className="grid gap-3 sm:gap-4">
                  <motion.div variants={childVariants}>
                    <Card
                      className="cursor-pointer border-2 transition-all hover:border-primary hover:shadow-lg active:scale-[0.98]"
                      onClick={() => setRoleChoice("CLIENTE")}
                    >
                      <CardContent className="flex items-center gap-3 sm:gap-4 p-4 sm:p-6">
                        <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                          <ShoppingBag className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-display text-base sm:text-lg font-bold">Quero Comprar</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            Encontre ofertas incríveis com desconto em compra coletiva
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                  <motion.div variants={childVariants}>
                    <Card
                      className="cursor-pointer border-2 transition-all hover:border-secondary hover:shadow-lg active:scale-[0.98]"
                      onClick={() => setRoleChoice("VENDEDOR")}
                    >
                      <CardContent className="flex items-center gap-3 sm:gap-4 p-4 sm:p-6">
                        <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-xl bg-secondary/10">
                          <Store className="h-6 w-6 sm:h-7 sm:w-7 text-secondary" />
                        </div>
                        <div>
                          <h3 className="font-display text-base sm:text-lg font-bold">Quero Vender</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            Crie ofertas coletivas e aumente suas vendas
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>
                <motion.p variants={childVariants} className="text-center text-sm text-muted-foreground">
                  Já tem conta?{" "}
                  <button onClick={() => setMode("login")} className="font-semibold text-primary hover:underline">
                    Entrar
                  </button>
                </motion.p>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key={stepKey}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="w-full max-w-md"
            >
              <Card className="border-0 shadow-xl">
                <CardHeader className="text-center pb-2 sm:pb-4">
                  <img src="/logo-icon.png" alt="Compra Coletiva" className="mx-auto h-20 sm:h-24 w-auto object-contain" />
                  <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1">Compra Coletiva</h1>
                  <p className="text-base sm:text-lg font-semibold text-primary tracking-wide mt-0.5">JUNTOS, PAGAMOS MENOS!</p>
                  <CardTitle className="font-display text-base sm:text-lg mt-3">
                    {mode === "login" ? "Entrar na sua conta" : "Criar sua conta"}
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    {mode === "login"
                      ? "Acesse suas ofertas e carteira"
                      : roleChoice === "CLIENTE"
                        ? "Cadastro de Comprador"
                        : "Cadastro de Vendedor"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-4 sm:px-6">
                  <form onSubmit={mode === "login" ? handleLogin : handleRegister} className="space-y-3 sm:space-y-4">
                    {mode === "register" && (
                      <>
                        <button
                          type="button"
                          onClick={() => setRoleChoice(null)}
                          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
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
                            <Popover open={cityOpen} onOpenChange={setCityOpen}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={cityOpen}
                                  className="w-full justify-between font-normal"
                                  disabled={!selectedState}
                                >
                                  {selectedCity || (loadingCities ? "Carregando..." : "Selecione a cidade")}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                <Command>
                                  <CommandInput placeholder="Buscar cidade..." />
                                  <CommandList>
                                    <CommandEmpty>Nenhuma cidade encontrada.</CommandEmpty>
                                    {cities.map((c) => (
                                      <CommandItem
                                        key={c.id}
                                        value={c.nome}
                                        onSelect={() => {
                                          setSelectedCity(prev => prev === c.nome ? "" : c.nome);
                                          setCityOpen(false);
                                        }}
                                      >
                                        <Check className={cn("mr-2 h-4 w-4", selectedCity === c.nome ? "opacity-100" : "opacity-0")} />
                                        {c.nome}
                                      </CommandItem>
                                    ))}
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
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
                    {mode === "register" && (
                      <div className="flex items-start space-x-2">
                        <Checkbox
                          id="privacy"
                          checked={acceptedPrivacy}
                          onCheckedChange={(checked) => setAcceptedPrivacy(checked === true)}
                        />
                        <label htmlFor="privacy" className="text-sm text-muted-foreground leading-tight cursor-pointer">
                          Li e aceito a{" "}
                          <Link to="/privacy" target="_blank" className="font-semibold text-primary hover:underline">
                            Política de Privacidade
                          </Link>{" "}
                          e os{" "}
                          <Link to="/terms" target="_blank" className="font-semibold text-primary hover:underline">
                            Termos de Uso
                          </Link>
                        </label>
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

                  <div className="mt-3 sm:mt-4">
                    <div className="relative my-3 sm:my-4">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">ou</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full gap-2 text-sm sm:text-base"
                        size="lg"
                        disabled={loading}
                        onClick={async () => {
                          setLoading(true);
                          const { error } = await lovable.auth.signInWithOAuth("google", {
                            redirect_uri: window.location.origin,
                          });
                          setLoading(false);
                          if (error) {
                            toast({ title: "Erro ao entrar com Google", description: String(error), variant: "destructive" });
                          }
                        }}
                      >
                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        {mode === "login" ? "Entrar com Google" : "Cadastrar com Google"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full gap-2 text-sm sm:text-base"
                        size="lg"
                        disabled={loading}
                        onClick={async () => {
                          setLoading(true);
                          const { error } = await lovable.auth.signInWithOAuth("apple", {
                            redirect_uri: window.location.origin,
                          });
                          setLoading(false);
                          if (error) {
                            toast({ title: "Erro ao entrar com Apple", description: String(error), variant: "destructive" });
                          }
                        }}
                      >
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                        </svg>
                        {mode === "login" ? "Entrar com Apple" : "Cadastrar com Apple"}
                      </Button>
                    </div>
                  </div>
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Auth;
