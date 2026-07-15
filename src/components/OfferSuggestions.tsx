import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { ThumbsUp, Loader2, Plus, Lightbulb, Pencil, Trash2, X, Check } from "lucide-react";

interface Suggestion {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string | null;
  city: string | null;
  votes_count: number;
  created_at: string;
}

export function OfferSuggestions() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: ["profile-city", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("city, state")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data as { city: string | null; state: string | null };
    },
  });

  const userCity = profileQuery.data?.city ?? null;

  const suggestionsQuery = useQuery({
    queryKey: ["offer-suggestions", userCity],
    enabled: !!userCity,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("offer_suggestions")
        .select("*")
        .eq("city", userCity!)
        .order("votes_count", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as Suggestion[];
    },
  });

  const myVotesQuery = useQuery({
    queryKey: ["my-suggestion-votes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("offer_suggestion_votes")
        .select("suggestion_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return new Set((data ?? []).map((v) => v.suggestion_id));
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Faça login");
      if (!userCity) throw new Error("Defina sua cidade no perfil para sugerir ofertas.");
      const { error } = await supabase.from("offer_suggestions").insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        category: category.trim() || null,
        city: userCity,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Sugestão enviada!", description: "Obrigado pela contribuição." });
      setTitle(""); setDescription(""); setCategory("");
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ["offer-suggestions"] });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("offer_suggestions")
        .update({
          title: editTitle.trim(),
          description: editDescription.trim() || null,
          category: editCategory.trim() || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Sugestão atualizada!" });
      setEditingId(null);
      qc.invalidateQueries({ queryKey: ["offer-suggestions"] });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("offer_suggestions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Sugestão cancelada." });
      setConfirmDeleteId(null);
      qc.invalidateQueries({ queryKey: ["offer-suggestions"] });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const toggleVote = useMutation({
    mutationFn: async (suggestion: Suggestion) => {
      if (!user) throw new Error("Faça login");
      const has = myVotesQuery.data?.has(suggestion.id);
      if (has) {
        const { error } = await supabase
          .from("offer_suggestion_votes")
          .delete()
          .eq("suggestion_id", suggestion.id)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("offer_suggestion_votes")
          .insert({ suggestion_id: suggestion.id, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["offer-suggestions"] });
      qc.invalidateQueries({ queryKey: ["my-suggestion-votes"] });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const startEdit = (s: Suggestion) => {
    setEditingId(s.id);
    setEditTitle(s.title);
    setEditDescription(s.description ?? "");
    setEditCategory(s.category ?? "");
  };

  const suggestions = suggestionsQuery.data ?? [];
  const mySuggestions = suggestions.filter((s) => s.user_id === user?.id);

  if (profileQuery.isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!userCity) {
    return (
      <Card className="flex flex-col items-center gap-2 p-8 text-center">
        <Lightbulb className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Defina sua cidade no seu perfil para ver e enviar sugestões da sua região.
        </p>
      </Card>
    );
  }

  const renderCard = (s: Suggestion) => {
    const voted = myVotesQuery.data?.has(s.id) ?? false;
    const isMine = s.user_id === user?.id;
    const isEditing = editingId === s.id;

    if (isEditing) {
      return (
        <Card key={s.id} className="space-y-3 p-4">
          <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} maxLength={120} />
          <Textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            maxLength={500}
            rows={3}
          />
          <Input
            value={editCategory}
            onChange={(e) => setEditCategory(e.target.value)}
            maxLength={40}
            placeholder="Categoria (opcional)"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => updateMutation.mutate(s.id)}
              disabled={!editTitle.trim() || updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-1 h-4 w-4" />
              )}
              Salvar
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
              <X className="mr-1 h-4 w-4" /> Cancelar
            </Button>
          </div>
        </Card>
      );
    }

    return (
      <Card key={s.id} className="flex items-start gap-3 p-4">
        <Button
          variant={voted ? "default" : "outline"}
          size="sm"
          className="flex h-auto flex-col gap-0 px-3 py-2"
          onClick={() => toggleVote.mutate(s)}
          disabled={toggleVote.isPending}
          aria-label={voted ? "Remover curtida" : "Curtir sugestão"}
        >
          <ThumbsUp className="h-4 w-4" />
          <span className="text-xs font-bold">{s.votes_count}</span>
        </Button>
        <div className="min-w-0 flex-1">
          <h4 className="font-semibold">{s.title}</h4>
          {s.description && (
            <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {s.category && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                {s.category}
              </span>
            )}
            {s.city && (
              <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-secondary">
                📍 {s.city}
              </span>
            )}
            <span>
              {s.votes_count} {s.votes_count === 1 ? "pessoa curtiu" : "pessoas curtiram"}
            </span>
          </div>
        </div>
        {isMine && (
          <div className="flex flex-col gap-1">
            <Button size="icon" variant="ghost" onClick={() => startEdit(s)} aria-label="Editar">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setConfirmDeleteId(s.id)}
              aria-label="Cancelar"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Sugestões em <span className="font-semibold text-foreground">📍 {userCity}</span>
        </p>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="mr-1 h-4 w-4" /> Nova
        </Button>
      </div>

      {showForm && (
        <Card className="space-y-3 p-4">
          <Input
            placeholder="Título da sugestão *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
          />
          <Textarea
            placeholder="Descreva a oferta que você gostaria de ver..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            rows={3}
          />
          <Input
            placeholder="Categoria (opcional)"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            maxLength={40}
          />
          <p className="text-xs text-muted-foreground">
            Cidade: <span className="font-semibold">{userCity}</span>
          </p>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!title.trim() || createMutation.isPending}
            className="w-full"
          >
            {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar sugestão
          </Button>
        </Card>
      )}

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-auto md:inline-grid">
          <TabsTrigger value="all">Todas ({suggestions.length})</TabsTrigger>
          <TabsTrigger value="mine">Minhas ({mySuggestions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          {suggestionsQuery.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : suggestions.length === 0 ? (
            <Card className="flex flex-col items-center gap-2 p-8 text-center">
              <Lightbulb className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Ainda não há sugestões em {userCity}. Seja o primeiro!
              </p>
            </Card>
          ) : (
            <div className="space-y-3">{suggestions.map(renderCard)}</div>
          )}
        </TabsContent>

        <TabsContent value="mine" className="mt-4">
          {mySuggestions.length === 0 ? (
            <Card className="flex flex-col items-center gap-2 p-8 text-center">
              <Lightbulb className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Você ainda não enviou nenhuma sugestão.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">{mySuggestions.map(renderCard)}</div>
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!confirmDeleteId} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar sugestão?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A sugestão e todos os votos serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDeleteId && deleteMutation.mutate(confirmDeleteId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cancelar sugestão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
