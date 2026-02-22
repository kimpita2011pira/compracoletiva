import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, User } from "lucide-react";

const ProfilePage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("name, phone, whatsapp")
      .eq("id", user.id)
      .single()
      .then(({ data, error }) => {
        if (data) {
          setName(data.name || "");
          setPhone(data.phone || "");
          setWhatsapp(data.whatsapp || "");
        }
        if (error) console.error("Error loading profile:", error);
        setLoading(false);
      });
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ name: name.trim(), phone: phone.trim() || null, whatsapp: whatsapp.trim() || null })
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
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="mx-auto max-w-lg space-y-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>

        <Card className="border-0 shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <User className="h-8 w-8 text-primary" />
            </div>
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
                    onChange={(e) => setPhone(e.target.value)}
                    maxLength={20}
                    placeholder="(00) 0000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-whatsapp">WhatsApp</Label>
                  <Input
                    id="profile-whatsapp"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    maxLength={20}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Salvando..." : "Salvar alterações"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfilePage;
