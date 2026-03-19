import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useBrazilLocations } from "@/hooks/useBrazilLocations";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, User, Camera, Lock } from "lucide-react";
import { BecomeVendorCard } from "@/components/BecomeVendorCard";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
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

const ProfilePage = () => {
  const { user, roles } = useAuth();
  const isOnlyCliente = roles.length > 0 && roles.every((r) => r === "CLIENTE");
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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const { states, cities, loadingStates, loadingCities } = useBrazilLocations(selectedState);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("name, phone, whatsapp, avatar_url, state, city")
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
        }
        if (error) console.error("Error loading profile:", error);
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
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ 
        name: name.trim(), 
        phone: phone.trim() || null, 
        whatsapp: whatsapp.trim() || null,
        state: selectedState || null,
        city: selectedCity || null,
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
            <CardDescription>Edite suas informações pessoais</CardDescription>
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
                  <Label htmlFor="profile-whatsapp">WhatsApp</Label>
                  <Input
                    id="profile-whatsapp"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(formatPhone(e.target.value))}
                    maxLength={15}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="profile-state">Estado</Label>
                  <Select value={selectedState} onValueChange={(v) => { setSelectedState(v); setSelectedCity(""); }}>
                    <SelectTrigger id="profile-state">
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
                  <Label htmlFor="profile-city">Cidade</Label>
                  <Select value={selectedCity} onValueChange={setSelectedCity} disabled={!selectedState}>
                    <SelectTrigger id="profile-city">
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
              <Button type="submit" className="w-full" size="lg" disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Salvando..." : "Salvar alterações"}
              </Button>
            </form>
          </CardContent>
        </Card>
        <ChangePasswordCard />

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
