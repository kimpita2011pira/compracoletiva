import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: string[];
}

async function fetchRoles(userId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (error) {
      console.error("Failed to fetch roles:", error);
      return [];
    }
    return data?.map((r) => r.role) ?? [];
  } catch (err) {
    console.error("Role fetch exception:", err);
    return [];
  }
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    roles: [],
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const user = session?.user ?? null;
        const roles = user ? await fetchRoles(user.id) : [];
        setState({ user, session, loading: false, roles });
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const user = session?.user ?? null;
      const roles = user ? await fetchRoles(user.id) : [];
      setState({ user, session, loading: false, roles });
    }).catch((err) => {
      console.error("getSession failed:", err);
      setState({ user: null, session: null, loading: false, roles: [] });
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { ...state, signOut };
}
