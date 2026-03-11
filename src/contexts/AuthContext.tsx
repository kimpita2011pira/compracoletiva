import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: string[];
}

interface AuthContextValue extends AuthState {
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    roles: [],
  });

  useEffect(() => {
    let isMounted = true;

    // 1. Set up listener FIRST (recommended by Supabase docs)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const user = session?.user ?? null;
        if (user) {
          if (isMounted) {
            setState(prev => ({ ...prev, user, session }));
          }
          // Use setTimeout to avoid potential deadlocks with async in callback
          setTimeout(async () => {
            const roles = await fetchRoles(user.id);
            if (isMounted) {
              setState(prev => ({ ...prev, roles, loading: false }));
            }
          }, 0);
        } else {
          if (isMounted) {
            setState({ user: null, session: null, loading: false, roles: [] });
          }
        }
      }
    );

    // 2. Then get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const user = session?.user ?? null;
      let roles: string[] = [];
      if (user) {
        roles = await fetchRoles(user.id);
      }
      if (isMounted) {
        setState({ user, session, loading: false, roles });
      }
    }).catch((err) => {
      console.error("getSession failed:", err);
      if (isMounted) {
        setState({ user: null, session: null, loading: false, roles: [] });
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ ...state, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
