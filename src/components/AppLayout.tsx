import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { PageTransition } from "@/components/PageTransition";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationBell } from "@/components/NotificationBell";
import { ArrowLeft, Store, Shield, LogOut, Wallet, Package, User } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";

interface AppLayoutProps {
  children: React.ReactNode;
  /** If provided, shows back button + title instead of logo */
  title?: string;
  /** Extra content rendered on the right side of the header (before avatar dropdown) */
  headerRight?: React.ReactNode;
  /** Whether to show the footer (default: true) */
  showFooter?: boolean;
  /** Whether this is a public page (no auth header, just back + title) */
  isPublic?: boolean;
}

export function AppLayout({
  children,
  title,
  headerRight,
  showFooter = true,
  isPublic = false,
}: AppLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {isPublic ? (
        <PublicHeader title={title} />
      ) : (
        <AuthHeader title={title} headerRight={headerRight} />
      )}

      <PageTransition>
        <div className="flex-1 pb-16 md:pb-0">{children}</div>
      </PageTransition>

      {showFooter && <Footer />}
      {!isPublic && <BottomNav />}
    </div>
  );
}

function PublicHeader({ title }: { title?: string }) {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
      <div className="container flex h-16 items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-display text-xl font-bold text-primary">
          {title || "🛒 Compra Coletiva"}
        </h1>
      </div>
    </header>
  );
}

function AuthHeader({
  title,
  headerRight,
}: {
  title?: string;
  headerRight?: React.ReactNode;
}) {
  const { user, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.avatar_url) setAvatarUrl(data.avatar_url);
      });
  }, [user]);

  const isVendedor = roles.includes("VENDEDOR");
  const isAdmin = roles.includes("ADMIN");

  return (
    <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-3">
          {title ? (
            <>
              <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="font-display text-xl font-bold text-primary">{title}</h1>
            </>
          ) : (
            <h1
              className="font-display text-2xl font-bold text-primary cursor-pointer"
              onClick={() => navigate("/")}
            >
              🛒 Compra Coletiva
            </h1>
          )}
        </div>

        <div className="flex items-center gap-3">
          {headerRight}
          <NotificationBell />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full outline-none focus:ring-2 focus:ring-primary">
                <Avatar className="h-9 w-9 cursor-pointer">
                  {avatarUrl ? <AvatarImage src={avatarUrl} alt="Avatar" /> : null}
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {user?.email?.charAt(0).toUpperCase() ?? "U"}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-card border shadow-lg z-50">
              <DropdownMenuItem onClick={() => navigate("/profile")} className="cursor-pointer">
                <User className="mr-2 h-4 w-4" /> Meu Perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/wallet")} className="cursor-pointer">
                <Wallet className="mr-2 h-4 w-4" /> Minha Carteira
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/orders")} className="cursor-pointer">
                <Package className="mr-2 h-4 w-4" /> Meus Pedidos
              </DropdownMenuItem>
              {isVendedor && (
                <DropdownMenuItem onClick={() => navigate("/vendor")} className="cursor-pointer">
                  <Store className="mr-2 h-4 w-4" /> Área do Vendedor
                </DropdownMenuItem>
              )}
              {isAdmin && (
                <DropdownMenuItem onClick={() => navigate("/admin")} className="cursor-pointer">
                  <Shield className="mr-2 h-4 w-4" /> Painel Admin
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={signOut}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" /> Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  const navigate = useNavigate();
  return (
    <footer className="border-t bg-card/50 mt-auto">
      <div className="container py-10">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <h3 className="font-display text-lg font-bold text-primary">🛒 OfertaJá</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              A plataforma de compra coletiva que conecta você às melhores ofertas da sua cidade.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-foreground">Links Úteis</h4>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>
                <button onClick={() => navigate("/offers")} className="hover:text-primary transition-colors">
                  Ofertas Ativas
                </button>
              </li>
              <li>
                <button onClick={() => navigate("/wallet")} className="hover:text-primary transition-colors">
                  Minha Carteira
                </button>
              </li>
              <li>
                <button onClick={() => navigate("/orders")} className="hover:text-primary transition-colors">
                  Meus Pedidos
                </button>
              </li>
              <li>
                <button onClick={() => navigate("/profile")} className="hover:text-primary transition-colors">
                  Meu Perfil
                </button>
              </li>
              <li>
                <button onClick={() => navigate("/about")} className="hover:text-primary transition-colors">
                  Sobre
                </button>
              </li>
              <li>
                <button onClick={() => navigate("/terms")} className="hover:text-primary transition-colors">
                  Termos de Uso
                </button>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-foreground">Contato</h4>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li><a href="mailto:kimpita2011@gmail.com" className="hover:text-primary transition-colors">📧 kimpita2011@gmail.com</a></li>
              <li><a href="https://wa.me/5519991973737" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">📱 (19) 99197-3737 (WhatsApp)</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t pt-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} OfertaJá. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
