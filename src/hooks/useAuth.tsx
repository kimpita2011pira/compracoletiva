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
    let isMounted = true;

    async function loadSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user ?? null;
        let roles: string[] = [];
        if (user) {
          roles = await fetchRoles(user.id);
        }
        if (isMounted) {
          setState({ user, session, loading: false, roles });
        }
      } catch (err) {
        console.error("getSession failed:", err);
        if (isMounted) {
          setState({ user: null, session: null, loading: false, roles: [] });
        }
      }
    }

    loadSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const user = session?.user ?? null;
        if (user) {
          // Keep loading true until roles are fetched
          setState(prev => ({ ...prev, user, session }));
          fetchRoles(user.id).then(roles => {
            if (isMounted) {
              setState(prev => ({ ...prev, roles, loading: false }));
            }
          });
        } else {
          if (isMounted) {
            setState({ user: null, session: null, loading: false, roles: [] });
          }
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { ...state, signOut };
}
