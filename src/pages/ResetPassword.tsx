import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const isRecoveryFlow = useMemo(() => {
    const hash = new URLSearchParams(window.location.hash.replace("#", ""));
    return hash.get("type") === "recovery";
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast({ title: "Senha inválida", description: "A senha deve ter pelo menos 6 caracteres.", variant: "destructive" });
      return;
    }

    if (password !== confirmPassword) {
      toast({ title: "Senhas diferentes", description: "Confirme a senha corretamente.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast({ title: "Erro ao redefinir", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Senha atualizada", description: "Agora você já pode entrar com a nova senha." });
    navigate("/auth");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <Card className="w-full max-w-md border-0 shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="font-display text-2xl">Redefinir senha</CardTitle>
          <CardDescription>
            {isRecoveryFlow
              ? "Defina sua nova senha para continuar."
              : "Abra este link a partir do e-mail de recuperação para redefinir sua senha."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova senha</Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
                disabled={!isRecoveryFlow || loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar nova senha</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={6}
                required
                disabled={!isRecoveryFlow || loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={!isRecoveryFlow || loading}>
              {loading ? "Atualizando..." : "Atualizar senha"}
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => navigate("/auth")}>
              Voltar para login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
