import { useState } from "react";
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
import { ShieldCheck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

  const handleConfirm = async () => {
    if (!password.trim()) {
      toast.error("Digite sua senha para confirmar");
      return;
    }

    setVerifying(true);
    try {
      // Get current user email
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("Usuário não encontrado");

      // Re-authenticate with password
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password,
      });

      if (authError) {
        toast.error("Senha incorreta. Tente novamente.");
        setVerifying(false);
        return;
      }

      // Password verified, proceed with action
      await onConfirmed();
      setPassword("");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Erro na verificação");
    } finally {
      setVerifying(false);
    }
  };

  const isApproval = action === "APROVADO";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!verifying) { setPassword(""); onOpenChange(v); } }}>
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
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => { setPassword(""); onOpenChange(false); }} disabled={verifying}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={verifying || !password.trim()}
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
