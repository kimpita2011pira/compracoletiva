import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: string[];
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    roles: [],
  });

  useEffect(() => {
    // Set up listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const user = session?.user ?? null;
        setState({ user, session, loading: false, roles: user ? ["VENDEDOR"] : [] });
      }
    );

    // Then check existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const user = session?.user ?? null;
      setState({ user, session, loading: false, roles: user ? ["VENDEDOR"] : [] });
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
