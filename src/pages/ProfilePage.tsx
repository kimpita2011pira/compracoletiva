import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useBrazilLocations } from "@/hooks/useBrazilLocations";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, User, Camera, Lock, ChevronsUpDown, Check, Trash2, AlertTriangle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { BecomeVendorCard } from "@/components/BecomeVendorCard";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";


function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

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

function isValidBrazilianMobile(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  // Mobile must be 11 digits: DDD (2) + 9 + 8 digits
  if (digits.length !== 11) return false;
  if (!VALID_DDDS.has(digits.slice(0, 2))) return false;
  if (digits[2] !== "9") return false;
  return true;
}

const ChangePasswordCard = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const { toast } = useToast();

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      toast({ title: "Senhas não coincidem", description: "A confirmação deve ser igual à nova senha.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Senha muito curta", description: "A senha deve ter pelo menos 6 caracteres.", variant: "destructive" });
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) {
      toast({ title: "Erro ao alterar senha", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Senha alterada com sucesso! 🔒" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    }
  };

  return (
    <Card className="mt-6 border-0 shadow-xl">
      <CardHeader className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Lock className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="font-display text-lg">Alterar Senha</CardTitle>
        <CardDescription>Defina uma nova senha para sua conta</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">Nova senha</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Mínimo 6 caracteres"
            />
            <PasswordStrengthIndicator password={newPassword} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-new-password">Confirmar nova senha</Label>
            <Input
              id="confirm-new-password"
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              required
              minLength={6}
            />
            {confirmNewPassword && newPassword !== confirmNewPassword && (
              <p className="text-sm text-destructive">As senhas não coincidem</p>
            )}
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={changingPassword}>
            <Lock className="mr-2 h-4 w-4" />
            {changingPassword ? "Alterando..." : "Alterar senha"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

const DeleteAccountSection = () => {
  const [isFirstConfirmOpen, setIsFirstConfirmOpen] = useState(false);
  const [isSecondConfirmOpen, setIsSecondConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      // In a real application with Supabase, deleting an auth user usually requires 
      // an edge function or a service role key. 
      // Here we will call a database function that handles account deletion/anonymization
      // and then sign out.
      
      const { error } = await supabase.rpc('delete_user_account');
      
      if (error) {
        // If RPC doesn't exist yet, we'll implement it. 
        // For now, let's at least try to sign out and show an error if it fails.
        console.error("Error calling delete_user_account:", error);
        toast({ 
          title: "Erro ao excluir conta", 
          description: "Não foi possível processar sua solicitação no momento. Entre em contato com o suporte.", 
          variant: "destructive" 
        });
        setDeleting(false);
        return;
      }

      await supabase.auth.signOut();
      toast({ title: "Conta excluída", description: "Sua conta e dados foram removidos com sucesso." });
      navigate("/auth");
    } catch (error) {
      console.error("Delete account error:", error);
      toast({ title: "Erro técnico", description: "Ocorreu um erro ao tentar excluir sua conta.", variant: "destructive" });
      setDeleting(false);
    }
  };

  return (
    <div className="mt-8 pt-6 border-t border-destructive/20">
      <Card className="border-destructive/20 bg-destructive/5 shadow-none">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2 text-lg">
            <Trash2 className="h-5 w-5" />
            Zona de Perigo
          </CardTitle>
          <CardDescription>
            Ações irreversíveis relacionadas à sua conta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="font-medium text-sm">Excluir minha conta</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Isso removerá permanentemente todos os seus dados e pedidos.
              </p>
            </div>
            
            <AlertDialog open={isFirstConfirmOpen} onOpenChange={setIsFirstConfirmOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="shrink-0">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir Conta
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Você tem certeza absoluta?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Isso excluirá permanentemente seu perfil, 
                    histórico de pedidos e removerá seu acesso ao Compra Coletiva.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={(e) => {
                      e.preventDefault();
                      setIsFirstConfirmOpen(false);
                      setIsSecondConfirmOpen(true);
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Eu entendo, prosseguir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={isSecondConfirmOpen} onOpenChange={setIsSecondConfirmOpen}>
              <AlertDialogContent className="border-2 border-destructive">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-destructive uppercase tracking-widest font-black text-center">
                    CONFIRMAÇÃO FINAL
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-center font-bold text-foreground">
                    PARA EXCLUIR SUA CONTA DEFINITIVAMENTE, CLIQUE NO BOTÃO ABAIXO.
                    ESTA É SUA ÚLTIMA CHANCE DE DESISTIR.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                  <AlertDialogCancel className="w-full sm:w-auto">Desistir e manter minha conta</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto font-bold"
                  >
                    {deleting ? "Excluindo..." : "SIM, EXCLUIR MINHA CONTA AGORA"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};


const ProfilePage = () => {
  const { user, roles } = useAuth();
  const navigate = useNavigate();
  const isOnlyCliente = roles.length > 0 && roles.every((r) => r === "CLIENTE");
  const isFranqueado = roles.includes("FRANQUEADO");
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [cityOpen, setCityOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [defaultAddressId, setDefaultAddressId] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<any[]>([]);
  const { states, cities, loadingStates, loadingCities } = useBrazilLocations(selectedState);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("name, phone, whatsapp, avatar_url, state, city, default_address_id")
      .eq("id", user.id)
      .single()
      .then(({ data, error }) => {
        if (data) {
          setName(data.name || "");
          setPhone(formatPhone(data.phone || ""));
          setWhatsapp(formatPhone(data.whatsapp || ""));
          setAvatarUrl(data.avatar_url || null);
          setSelectedState(data.state || "");
          setSelectedCity(data.city || "");
          setDefaultAddressId(data.default_address_id || null);
        }
        if (error) console.error("Error loading profile:", error);
      });

    supabase
      .from("addresses")
      .select("*")
      .eq("user_id", user.id)
      .then(({ data }) => {
        setAddresses(data || []);
        setLoading(false);
      });
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Arquivo inválido", description: "Selecione uma imagem.", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo 2MB.", variant: "destructive" });
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const filePath = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast({ title: "Erro no upload", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: publicData } = supabase.storage.from("avatars").getPublicUrl(filePath);
    const newUrl = `${publicData.publicUrl}?t=${Date.now()}`;

    await supabase.from("profiles").update({ avatar_url: newUrl }).eq("id", user.id);
    setAvatarUrl(newUrl);
    setUploading(false);
    toast({ title: "Foto atualizada! 📸" });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Franqueado must have a valid Brazilian mobile WhatsApp
    if (isFranqueado) {
      if (!whatsapp.trim()) {
        toast({ title: "WhatsApp obrigatório", description: "Franqueados devem cadastrar um número de WhatsApp válido.", variant: "destructive" });
        return;
      }
      if (!isValidBrazilianMobile(whatsapp)) {
        toast({ title: "WhatsApp inválido", description: "Use o formato (DDD) 9XXXX-XXXX com DDD brasileiro válido.", variant: "destructive" });
        return;
      }
    } else if (whatsapp.trim() && !isValidBrazilianMobile(whatsapp)) {
      toast({ title: "WhatsApp inválido", description: "Use o formato (DDD) 9XXXX-XXXX com DDD brasileiro válido.", variant: "destructive" });
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ 
        name: name.trim(), 
        phone: phone.trim() || null, 
        whatsapp: whatsapp.trim() || null,
        state: selectedState || null,
        city: selectedCity || null,
        default_address_id: defaultAddressId || null,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Perfil atualizado! ✅" });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <AppLayout title="👤 Meu Perfil">
      <main className="container max-w-lg py-8">
        <Card className="border-0 shadow-xl">
          <CardHeader className="text-center">
            <div className="relative mx-auto">
              <div
                className="flex h-20 w-20 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-primary/10 transition-opacity hover:opacity-80"
                onClick={() => fileInputRef.current?.click()}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-10 w-10 text-primary" />
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-colors hover:bg-primary/90"
              >
                <Camera className="h-4 w-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
            {uploading && <p className="text-xs text-muted-foreground">Enviando...</p>}
            <CardTitle className="font-display text-xl">Meu Perfil</CardTitle>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {roles.map((role) => (
                <Badge key={role} variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                  {role}
                </Badge>
              ))}
            </div>
            <CardDescription className="mt-2">Edite suas informações pessoais</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="profile-email">Email</Label>
                <Input id="profile-email" value={user?.email ?? ""} disabled className="opacity-60" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-name">Nome completo</Label>
                <Input
                  id="profile-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={100}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="profile-phone">Telefone</Label>
                  <Input
                    id="profile-phone"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    maxLength={15}
                    placeholder="(00) 0000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-whatsapp">
                    WhatsApp{isFranqueado && <span className="text-destructive ml-0.5">*</span>}
                  </Label>
                  <Input
                    id="profile-whatsapp"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(formatPhone(e.target.value))}
                    maxLength={15}
                    placeholder="(00) 00000-0000"
                    required={isFranqueado}
                  />
                  {isFranqueado && (
                    <p className="text-[11px] text-muted-foreground">
                      Obrigatório para receber notificações de saques e ações administrativas.
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 opacity-60 pointer-events-none">
                <div className="space-y-2">
                  <Label htmlFor="profile-state">Estado (Fixo do cadastro)</Label>
                  <Input id="profile-state" value={selectedState} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-city">Cidade (Fixo do cadastro)</Label>
                  <Input id="profile-city" value={selectedCity} disabled />
                </div>
              </div>

              <div className="space-y-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
                <div className="space-y-2">
                  <Label htmlFor="default-address" className="flex items-center gap-2">
                    📍 Endereço Principal (Dados Pessoais)
                  </Label>
                  <Select value={defaultAddressId || "none"} onValueChange={(v) => setDefaultAddressId(v === "none" ? null : v)}>
                    <SelectTrigger id="default-address" className="bg-background">
                      <SelectValue placeholder="Selecione um endereço" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum selecionado</SelectItem>
                      {addresses.map((addr) => (
                        <SelectItem key={addr.id} value={addr.id}>
                          {addr.label || `${addr.street}, ${addr.number}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground mt-2">
                    Este endereço será sugerido automaticamente em pedidos com entrega. Se não houver endereços na lista, adicione um em{" "}
                    <button type="button" onClick={() => navigate("/profile/addresses")} className="text-primary font-bold hover:underline">
                      Meus Endereços
                    </button>.
                  </p>
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Salvando..." : "Salvar alterações"}
              </Button>
            </form>
          </CardContent>
        </Card>
        <ChangePasswordCard />
        <DeleteAccountSection />


        {isOnlyCliente && (
          <div className="mt-6">
            <BecomeVendorCard />
          </div>
        )}
      </main>
    </AppLayout>
  );
};

export default ProfilePage;
