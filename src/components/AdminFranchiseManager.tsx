import { useState } from "react";
import { useFranchises } from "@/hooks/useFranchises";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2, MapPin, Building2, Search, X } from "lucide-react";
import { toast } from "sonner";

export function AdminFranchiseManager() {
  const { list, create, update, remove, addCity, removeCity } = useFranchises();
  const [createOpen, setCreateOpen] = useState(false);
  const [emailSearch, setEmailSearch] = useState("");
  const [foundUser, setFoundUser] = useState<{ id: string; name: string } | null>(null);
  const [searching, setSearching] = useState(false);
  const [commission, setCommission] = useState("10");
  const [city, setCity] = useState("");
  const [stateUF, setStateUF] = useState("");
  const [pendingCities, setPendingCities] = useState<{ city: string; state: string }[]>([]);
  const [notes, setNotes] = useState("");

  // Per-franchise add-city state
  const [addCityFor, setAddCityFor] = useState<string | null>(null);
  const [newCityName, setNewCityName] = useState("");
  const [newCityState, setNewCityState] = useState("");

  const searchUserByName = async () => {
    if (!emailSearch.trim()) return;
    setSearching(true);
    setFoundUser(null);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, name")
      .ilike("name", `%${emailSearch.trim()}%`)
      .limit(1)
      .maybeSingle();
    setSearching(false);
    if (error || !data) {
      toast.error("Usuário não encontrado");
      return;
    }
    setFoundUser(data);
  };

  const addPendingCity = () => {
    if (!city.trim() || !stateUF.trim()) return;
    setPendingCities([...pendingCities, { city: city.trim(), state: stateUF.trim().toUpperCase() }]);
    setCity("");
    setStateUF("");
  };

  const handleCreate = () => {
    if (!foundUser) return toast.error("Selecione um usuário");
    if (pendingCities.length === 0) return toast.error("Adicione pelo menos uma cidade");
    const rate = parseFloat(commission);
    if (isNaN(rate) || rate < 1 || rate > 50) return toast.error("Comissão deve ser entre 1% e 50%");

    create.mutate(
      { user_id: foundUser.id, commission_rate: rate, cities: pendingCities, notes: notes.trim() || undefined },
      {
        onSuccess: () => {
          setCreateOpen(false);
          setFoundUser(null);
          setEmailSearch("");
          setCommission("10");
          setPendingCities([]);
          setNotes("");
        },
      }
    );
  };

  if (list.isLoading) {
    return <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Franquias</h2>
          <p className="text-sm text-muted-foreground">Gerencie franqueados regionais e suas cidades</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Nova Franquia</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Criar nova franquia</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Buscar usuário pelo nome</Label>
                <div className="flex gap-2">
                  <Input value={emailSearch} onChange={(e) => setEmailSearch(e.target.value)} placeholder="Nome do usuário" />
                  <Button type="button" variant="outline" onClick={searchUserByName} disabled={searching}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                {foundUser && (
                  <div className="rounded-md border bg-muted/30 p-2 text-sm">
                    <strong>{foundUser.name}</strong> <span className="text-muted-foreground text-xs">({foundUser.id.slice(0, 8)}...)</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Comissão total (%)</Label>
                <Input type="number" min="1" max="50" step="0.5" value={commission} onChange={(e) => setCommission(e.target.value)} />
                <p className="text-xs text-muted-foreground">
                  1% reservado à plataforma. Franqueado recebe {(parseFloat(commission || "0") - 1).toFixed(1)}%.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Cidades atendidas</Label>
                <div className="flex gap-2">
                  <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Cidade" />
                  <Input value={stateUF} onChange={(e) => setStateUF(e.target.value)} placeholder="UF" maxLength={2} className="w-20" />
                  <Button type="button" variant="outline" onClick={addPendingCity}><Plus className="h-4 w-4" /></Button>
                </div>
                {pendingCities.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {pendingCities.map((c, i) => (
                      <Badge key={i} variant="secondary" className="gap-1">
                        {c.city}/{c.state}
                        <button onClick={() => setPendingCities(pendingCities.filter((_, idx) => idx !== i))}>
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Observações (opcional)</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={create.isPending}>Criar franquia</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {list.data?.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed py-16 text-center">
          <Building2 className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">Nenhuma franquia cadastrada</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {list.data?.map((f) => (
            <div key={f.id} className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    <h3 className="font-bold">{f.profile?.name ?? "Usuário"}</h3>
                    <Badge variant={f.active ? "default" : "secondary"}>
                      {f.active ? "Ativa" : "Inativa"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Comissão total: <strong>{f.commission_rate}%</strong> · Franqueado:{" "}
                    <strong>{(f.commission_rate - 1).toFixed(1)}%</strong> · Plataforma: <strong>1%</strong>
                  </p>
                  {f.notes && <p className="mt-1 text-xs italic text-muted-foreground">{f.notes}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={f.active}
                    onCheckedChange={(v) => update.mutate({ id: f.id, active: v })}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      if (confirm("Remover esta franquia? O usuário perderá o papel FRANQUEADO.")) {
                        remove.mutate(f.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Cidades ({f.cities?.length ?? 0})
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => setAddCityFor(addCityFor === f.id ? null : f.id)}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Adicionar
                  </Button>
                </div>

                {addCityFor === f.id && (
                  <div className="mb-2 flex gap-2">
                    <Input value={newCityName} onChange={(e) => setNewCityName(e.target.value)} placeholder="Cidade" className="h-8 text-sm" />
                    <Input value={newCityState} onChange={(e) => setNewCityState(e.target.value)} placeholder="UF" maxLength={2} className="h-8 w-16 text-sm" />
                    <Button
                      size="sm"
                      onClick={() => {
                        if (!newCityName.trim() || !newCityState.trim()) return;
                        addCity.mutate(
                          { franchise_id: f.id, city: newCityName.trim(), state: newCityState.trim().toUpperCase() },
                          { onSuccess: () => { setNewCityName(""); setNewCityState(""); setAddCityFor(null); } }
                        );
                      }}
                    >
                      OK
                    </Button>
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5">
                  {f.cities?.map((c) => (
                    <Badge key={c.id} variant="outline" className="gap-1">
                      {c.city}/{c.state}
                      <button onClick={() => removeCity.mutate(c.id)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  {f.cities?.length === 0 && <span className="text-xs text-muted-foreground italic">Nenhuma cidade vinculada</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
