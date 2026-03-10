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
    // Get initial session first
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const user = session?.user ?? null;
      let roles: string[] = [];
      if (user) {
        roles = await fetchRoles(user.id);
      }
      setState({ user, session, loading: false, roles });
    }).catch((err) => {
      console.error("getSession failed:", err);
      setState({ user: null, session: null, loading: false, roles: [] });
    });

    // Listen for auth changes - DO NOT await inside callback to avoid deadlocks
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const user = session?.user ?? null;
        setState(prev => ({ ...prev, user, session, loading: false }));
        if (user) {
          fetchRoles(user.id).then(roles => {
            setState(prev => ({ ...prev, roles }));
          });
        } else {
          setState(prev => ({ ...prev, roles: [] }));
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { ...state, signOut };
}
