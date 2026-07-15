import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { ThumbsUp, Loader2, Plus, Lightbulb } from "lucide-react";

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

  const suggestions = suggestionsQuery.data ?? [];

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Sugestões em <span className="font-semibold text-foreground">📍 {userCity}</span>. Vote nas ideias da comunidade.
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
        <div className="space-y-3">
          {suggestions.map((s) => {
            const voted = myVotesQuery.data?.has(s.id) ?? false;
            return (
              <Card key={s.id} className="flex items-start gap-3 p-4">
                <Button
                  variant={voted ? "default" : "outline"}
                  size="sm"
                  className="flex h-auto flex-col gap-0 px-3 py-2"
                  onClick={() => toggleVote.mutate(s)}
                  disabled={toggleVote.isPending}
                >
                  <ThumbsUp className="h-4 w-4" />
                  <span className="text-xs font-bold">{s.votes_count}</span>
                </Button>
                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold">{s.title}</h4>
                  {s.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
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
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
