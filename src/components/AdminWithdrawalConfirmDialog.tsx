import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Loader2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const MAX_ATTEMPTS = 3;
const LOCKOUT_SECONDS = 60;

interface AdminWithdrawalConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: "APROVADO" | "REJEITADO";
  amount: number;
  vendorName: string;
  onConfirmed: () => Promise<void>;
}

export function AdminWithdrawalConfirmDialog({
  open,
  onOpenChange,
  action,
  amount,
  vendorName,
  onConfirmed,
}: AdminWithdrawalConfirmDialogProps) {
  const [password, setPassword] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(0);

  const isLocked = lockedUntil !== null && Date.now() < lockedUntil;

  // Countdown timer
  useEffect(() => {
    if (!lockedUntil) return;
    const tick = () => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockedUntil(null);
        setAttempts(0);
        setCountdown(0);
      } else {
        setCountdown(remaining);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  // Reset state when dialog closes
  const handleOpenChange = useCallback((v: boolean) => {
    if (!verifying) {
      setPassword("");
      if (!v && !isLocked) setAttempts(0);
      onOpenChange(v);
    }
  }, [verifying, isLocked, onOpenChange]);

  const handleConfirm = async () => {
    if (!password.trim() || isLocked) return;

    setVerifying(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("Usuário não encontrado");

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password,
      });

      if (authError) {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setPassword("");

        if (newAttempts >= MAX_ATTEMPTS) {
          setLockedUntil(Date.now() + LOCKOUT_SECONDS * 1000);
          toast.error(`Bloqueado por ${LOCKOUT_SECONDS}s após ${MAX_ATTEMPTS} tentativas incorretas`);
        } else {
          toast.error(`Senha incorreta. ${MAX_ATTEMPTS - newAttempts} tentativa(s) restante(s).`);
        }
        setVerifying(false);
        return;
      }

      await onConfirmed();
      setPassword("");
      setAttempts(0);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Erro na verificação");
    } finally {
      setVerifying(false);
    }
  };

  const isApproval = action === "APROVADO";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Confirmação de Segurança
          </DialogTitle>
          <DialogDescription>
            Para {isApproval ? "aprovar" : "rejeitar"} este saque, digite sua senha de administrador.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg border bg-muted/50 p-3 space-y-1">
            <p className="text-sm text-muted-foreground">Vendedor</p>
            <p className="font-semibold text-sm">{vendorName}</p>
            <p className="text-sm text-muted-foreground">Valor</p>
            <p className="font-display font-bold text-lg text-primary">
              R$ {Number(amount).toFixed(2).replace(".", ",")}
            </p>
            <p className="text-sm text-muted-foreground">Ação</p>
            <p className={`font-semibold text-sm ${isApproval ? "text-success" : "text-destructive"}`}>
              {isApproval ? "✅ Aprovar saque" : "❌ Rejeitar saque"}
            </p>
          </div>

          {isLocked ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <Lock className="h-6 w-6 text-destructive" />
              <p className="text-sm font-semibold text-destructive">Acesso bloqueado temporariamente</p>
              <p className="text-xs text-muted-foreground">
                Aguarde <span className="font-mono font-bold text-destructive">{countdown}s</span> para tentar novamente
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="admin-password">Sua senha</Label>
              <Input
                id="admin-password"
                type="password"
                placeholder="Digite sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
                disabled={verifying}
                autoFocus
              />
              {attempts > 0 && (
                <p className="text-xs text-destructive">
                  {MAX_ATTEMPTS - attempts} tentativa(s) restante(s)
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={verifying}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={verifying || !password.trim() || isLocked}
            className={isApproval ? "" : "bg-destructive hover:bg-destructive/90"}
          >
            {verifying ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <ShieldCheck className="h-4 w-4 mr-1" />}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
