import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MapPin, Plus, Trash2, Home, Check } from "lucide-react";
import { useBrazilLocations } from "@/hooks/useBrazilLocations";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function MyAddresses() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Form state
  const [label, setLabel] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [saving, setSaving] = useState(false);

  const { states, cities } = useBrazilLocations(selectedState);

  const loadAddresses = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("addresses")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    
    if (data) setAddresses(data);
    setLoading(false);
  };

  useEffect(() => {
    loadAddresses();
  }, [user]);

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    const { error } = await supabase.from("addresses").insert({
      user_id: user.id,
      label: label.trim() || null,
      street: street.trim(),
      number: number.trim(),
      complement: complement.trim() || null,
      neighborhood: neighborhood.trim(),
      city: selectedCity,
      state: selectedState,
      zip_code: zipCode.replace(/\D/g, ""),
    });

    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar endereço", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Endereço adicionado! 🏠" });
      setShowAddForm(false);
      resetForm();
      loadAddresses();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("addresses").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Endereço removido" });
      loadAddresses();
    }
  };

  const resetForm = () => {
    setLabel("");
    setStreet("");
    setNumber("");
    setComplement("");
    setNeighborhood("");
    setZipCode("");
    setSelectedState("");
    setSelectedCity("");
  };

  return (
    <AppLayout title="📍 Meus Endereços">
      <main className="container max-w-2xl py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold">Meus Endereços</h2>
          <Button onClick={() => setShowAddForm(!showAddForm)} variant={showAddForm ? "outline" : "default"}>
            {showAddForm ? "Cancelar" : <><Plus className="mr-2 h-4 w-4" /> Novo Endereço</>}
          </Button>
        </div>

        {showAddForm && (
          <Card className="border-primary/20 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Novo Endereço</CardTitle>
              <CardDescription>Preencha os dados para entrega</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddAddress} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="addr-label">Apelido (ex: Casa, Trabalho)</Label>
                  <Input id="addr-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Opcional" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                   <div className="col-span-2 space-y-2">
                    <Label htmlFor="addr-street">Rua/Logradouro</Label>
                    <Input id="addr-street" value={street} onChange={(e) => setStreet(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="addr-number">Número</Label>
                    <Input id="addr-number" value={number} onChange={(e) => setNumber(e.target.value)} required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="addr-comp">Complemento</Label>
                    <Input id="addr-comp" value={complement} onChange={(e) => setComplement(e.target.value)} placeholder="Apto, Bloco..." />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="addr-neigh">Bairro</Label>
                    <Input id="addr-neigh" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} required />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="addr-zip">CEP</Label>
                    <Input id="addr-zip" value={zipCode} onChange={(e) => setZipCode(e.target.value)} required maxLength={9} />
                  </div>
                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Select value={selectedState} onValueChange={(v) => { setSelectedState(v); setSelectedCity(""); }}>
                      <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                      <SelectContent>
                        {states.map(s => <SelectItem key={s.sigla} value={s.sigla}>{s.sigla}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Cidade</Label>
                    <Select value={selectedCity} onValueChange={setSelectedCity} disabled={!selectedState}>
                      <SelectTrigger><SelectValue placeholder="Cidade" /></SelectTrigger>
                      <SelectContent>
                        {cities.map(c => <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? "Salvando..." : "Salvar Endereço"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4">
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Carregando...</p>
          ) : addresses.length === 0 ? (
            <Card className="p-8 text-center bg-muted/20 border-dashed">
              <MapPin className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Você ainda não cadastrou nenhum endereço.</p>
            </Card>
          ) : (
            addresses.map((addr) => (
              <Card key={addr.id} className="relative overflow-hidden group">
                <CardContent className="p-5 flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Home className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold flex items-center gap-2">
                      {addr.label || "Endereço"}
                      {addr.is_default && <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full">Principal</span>}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {addr.street}, {addr.number} {addr.complement && }
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {addr.neighborhood} — {addr.city}, {addr.state}
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDelete(addr.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </AppLayout>
  );
}
