import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { usePlatformSettings, useUpdateMonthlyAdminFee } from "@/hooks/usePlatformSettings";
import { Settings2 } from "lucide-react";

export function AdminPlatformSettings() {
  const { data, isLoading } = usePlatformSettings();
  const update = useUpdateMonthlyAdminFee();
  const [value, setValue] = useState<string>("");

  useEffect(() => {
    if (data) setValue(String(data.monthly_admin_fee ?? 0));
  }, [data]);

  const handleSave = () => {
    const num = Number(value.replace(",", "."));
    if (!Number.isFinite(num) || num < 0) {
      toast.error("Informe um valor válido (≥ 0)");
      return;
    }
    update.mutate(num, {
      onSuccess: () => toast.success("Taxa mensal atualizada!"),
      onError: (err) => toast.error(`Erro: ${(err as Error).message}`),
    });
  };

  return (
    <div className="rounded-2xl border bg-card p-6 space-y-4 max-w-xl">
      <div className="flex items-center gap-2">
        <Settings2 className="h-5 w-5 text-primary" />
        <h2 className="font-display text-lg font-bold">Taxa de administração mensal</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Valor debitado mensalmente da carteira dos <strong>compradores</strong>. Se o saldo for
        insuficiente, a taxa é cobrada automaticamente após a próxima recarga do mesmo mês.
        Meses sem uso <strong>não acumulam</strong>. Vendedores, administradores e franqueados
        não são cobrados.
      </p>
      <div className="space-y-2">
        <Label htmlFor="admin-fee">Valor da taxa (R$)</Label>
        <Input
          id="admin-fee"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="0,00"
          disabled={isLoading}
        />
      </div>
      <Button onClick={handleSave} disabled={update.isPending || isLoading} className="font-bold">
        {update.isPending ? "Salvando..." : "Salvar"}
      </Button>
    </div>
  );
}
