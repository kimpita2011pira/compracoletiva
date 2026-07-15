import { useMemo, useState } from "react";
import { useAdminFeeCharges, useAdminFeeMembers, useToggleAdminFeeExempt } from "@/hooks/useAdminFee";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { FileClock, ShieldOff, ShieldCheck, Search } from "lucide-react";

function money(n: number) {
  return `R$ ${Number(n).toFixed(2).replace(".", ",")}`;
}
function monthLabel(m: string) {
  const [y, mo] = m.split("-");
  return `${mo}/${y}`;
}
function currentMonthISO() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

export function AdminFeeHistory() {
  const [month, setMonth] = useState<string>(currentMonthISO());
  const [chargeSearch, setChargeSearch] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const { data: settings } = usePlatformSettings();
  const { data: charges, isLoading } = useAdminFeeCharges(month || undefined, chargeSearch);
  const { data: members, isLoading: mLoading } = useAdminFeeMembers(memberSearch);
  const toggle = useToggleAdminFeeExempt();

  const totals = useMemo(() => {
    const rows = charges ?? [];
    const sum = rows.reduce((acc, r) => acc + Number(r.amount ?? 0), 0);
    return { count: rows.length, sum };
  }, [charges]);

  const monthOptions = useMemo(() => {
    const opts: string[] = [];
    const d = new Date();
    for (let i = 0; i < 12; i++) {
      const dt = new Date(d.getFullYear(), d.getMonth() - i, 1);
      opts.push(dt.toISOString().slice(0, 10));
    }
    return opts;
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <FileClock className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg font-bold">Taxa administrativa</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Valor atual configurado: <strong>{money(settings?.monthly_admin_fee ?? 0)}</strong>/mês.
          Meses sem saldo <strong>não acumulam</strong> — a cobrança volta na próxima recarga do mesmo mês.
        </p>
      </div>

      <Tabs defaultValue="history">
        <TabsList>
          <TabsTrigger value="history">📜 Histórico</TabsTrigger>
          <TabsTrigger value="exemptions">🛡️ Isenções</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[240px_1fr]">
            <div>
              <Label className="text-xs">Mês</Label>
              <select
                className="mt-1 w-full h-10 rounded-md border bg-background px-3 text-sm"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              >
                <option value="">Todos os meses</option>
                {monthOptions.map((m) => (
                  <option key={m} value={m}>{monthLabel(m)}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Buscar por nome</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={chargeSearch}
                  onChange={(e) => setChargeSearch(e.target.value)}
                  placeholder="Nome do usuário"
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 text-sm">
            <Badge variant="outline">{totals.count} cobranças</Badge>
            <Badge variant="outline">Total: {money(totals.sum)}</Badge>
          </div>

          <div className="rounded-xl border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>Mês</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Cobrado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                )}
                {!isLoading && (!charges || charges.length === 0) && (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma cobrança encontrada</TableCell></TableRow>
                )}
                {charges?.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      {c.profiles?.name ?? "—"}
                      {c.profiles?.admin_fee_exempt && (
                        <Badge variant="outline" className="ml-2 text-[10px] text-success">Isento</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.profiles?.city ? `${c.profiles.city}/${c.profiles.state ?? ""}` : "—"}
                    </TableCell>
                    <TableCell>{monthLabel(c.month)}</TableCell>
                    <TableCell className="text-right font-mono">{money(Number(c.amount))}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {new Date(c.created_at).toLocaleString("pt-BR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="exemptions" className="space-y-4">
          <div>
            <Label className="text-xs">Buscar usuário</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Nome"
                className="pl-9"
              />
            </div>
          </div>

          <div className="rounded-xl border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead className="text-right">Isento da taxa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mLoading && (
                  <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                )}
                {!mLoading && (!members || members.length === 0) && (
                  <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Nenhum usuário encontrado</TableCell></TableRow>
                )}
                {members?.map((m: any) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium flex items-center gap-2">
                      {m.admin_fee_exempt ? <ShieldCheck className="h-4 w-4 text-success" /> : <ShieldOff className="h-4 w-4 text-muted-foreground" />}
                      {m.name || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {m.city ? `${m.city}/${m.state ?? ""}` : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Switch
                        checked={!!m.admin_fee_exempt}
                        disabled={toggle.isPending}
                        onCheckedChange={(v) =>
                          toggle.mutate(
                            { userId: m.id, exempt: v },
                            {
                              onSuccess: () => toast.success(v ? "Usuário isento" : "Isenção removida"),
                              onError: (e) => toast.error(`Erro: ${(e as Error).message}`),
                            },
                          )
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
