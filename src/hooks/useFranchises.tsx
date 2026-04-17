import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Franchise {
  id: string;
  user_id: string;
  commission_rate: number;
  active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  cities?: FranchiseCity[];
  profile?: { name: string } | null;
}

export interface FranchiseCity {
  id: string;
  franchise_id: string;
  city: string;
  state: string;
}

export function useFranchises() {
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["franchises"],
    queryFn: async () => {
      const { data: franchises, error } = await supabase
        .from("franchises")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const ids = franchises?.map((f) => f.id) ?? [];
      const userIds = franchises?.map((f) => f.user_id) ?? [];

      const [{ data: cities }, { data: profiles }] = await Promise.all([
        ids.length
          ? supabase.from("franchise_cities").select("*").in("franchise_id", ids)
          : Promise.resolve({ data: [] as FranchiseCity[] }),
        userIds.length
          ? supabase.from("profiles").select("id,name").in("id", userIds)
          : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      ]);

      return (franchises ?? []).map((f) => ({
        ...f,
        cities: cities?.filter((c) => c.franchise_id === f.id) ?? [],
        profile: profiles?.find((p) => p.id === f.user_id) ?? null,
      })) as Franchise[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: {
      user_id: string;
      commission_rate: number;
      cities: { city: string; state: string }[];
      notes?: string;
    }) => {
      const { data: franchise, error } = await supabase
        .from("franchises")
        .insert({
          user_id: input.user_id,
          commission_rate: input.commission_rate,
          notes: input.notes ?? null,
        })
        .select()
        .single();
      if (error) throw error;

      if (input.cities.length) {
        const { error: cErr } = await supabase
          .from("franchise_cities")
          .insert(input.cities.map((c) => ({ ...c, franchise_id: franchise.id })));
        if (cErr) throw cErr;
      }

      // Promote user to FRANQUEADO role
      await supabase.from("user_roles").insert({ user_id: input.user_id, role: "FRANQUEADO" as any });

      return franchise;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["franchises"] });
      toast.success("Franquia criada com sucesso");
    },
    onError: (err: any) => toast.error(err.message ?? "Erro ao criar franquia"),
  });

  const update = useMutation({
    mutationFn: async (input: { id: string; commission_rate?: number; active?: boolean; notes?: string | null }) => {
      const { id, ...patch } = input;
      const { error } = await supabase.from("franchises").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["franchises"] });
      toast.success("Franquia atualizada");
    },
    onError: (err: any) => toast.error(err.message ?? "Erro ao atualizar"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { data: franchise } = await supabase.from("franchises").select("user_id").eq("id", id).single();
      const { error } = await supabase.from("franchises").delete().eq("id", id);
      if (error) throw error;
      if (franchise?.user_id) {
        await supabase.from("user_roles").delete().eq("user_id", franchise.user_id).eq("role", "FRANQUEADO" as any);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["franchises"] });
      toast.success("Franquia removida");
    },
    onError: (err: any) => toast.error(err.message ?? "Erro ao remover"),
  });

  const addCity = useMutation({
    mutationFn: async (input: { franchise_id: string; city: string; state: string }) => {
      const { error } = await supabase.from("franchise_cities").insert(input);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["franchises"] });
      toast.success("Cidade vinculada");
    },
    onError: (err: any) => toast.error(err.message ?? "Erro ao vincular cidade (já pertence a outra franquia?)"),
  });

  const removeCity = useMutation({
    mutationFn: async (cityId: string) => {
      const { error } = await supabase.from("franchise_cities").delete().eq("id", cityId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["franchises"] });
      toast.success("Cidade removida");
    },
    onError: (err: any) => toast.error(err.message ?? "Erro ao remover cidade"),
  });

  return { list, create, update, remove, addCity, removeCity };
}

export function useMyFranchise() {
  return useQuery({
    queryKey: ["my-franchise"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: franchise } = await supabase
        .from("franchises")
        .select("*")
        .eq("user_id", user.id)
        .eq("active", true)
        .maybeSingle();
      if (!franchise) return null;
      const { data: cities } = await supabase
        .from("franchise_cities")
        .select("*")
        .eq("franchise_id", franchise.id);
      return { ...franchise, cities: cities ?? [] } as Franchise;
    },
  });
}
