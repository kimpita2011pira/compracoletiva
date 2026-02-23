import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ShoppingBag, Store, Shield, LogOut, Wallet, Package, User } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";

const Index = () => {
  const { user, loading, roles, signOut } = useAuth();
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const isVendedor = roles.includes("VENDEDOR");
  const isAdmin = roles.includes("ADMIN");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
        <div className="container flex h-16 items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-primary">🛒 OfertaJá</h1>
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 cursor-pointer" onClick={() => navigate("/profile")}>
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt="Avatar" />
              ) : null}
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {user.email?.charAt(0).toUpperCase() ?? "U"}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground">{user.email}</span>
            <NotificationBell />
            <Button variant="ghost" size="icon" onClick={() => navigate("/profile")} title="Meu Perfil">
              <User className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container py-12 text-center">
        <h2 className="font-display text-4xl font-bold md:text-5xl">
          Ofertas incríveis em{" "}
          <span className="text-primary">compra coletiva</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
          Quanto mais gente compra, mais todo mundo economiza! 🔥
        </p>
      </section>

      {/* Quick actions */}
      <section className="container grid gap-4 pb-12 md:grid-cols-3">
        <QuickCard
          icon={<ShoppingBag className="h-8 w-8" />}
          title="Ofertas Ativas"
          description="Veja as melhores ofertas disponíveis agora"
          color="primary"
          onClick={() => navigate("/offers")}
        />
        <QuickCard
          icon={<Wallet className="h-8 w-8" />}
          title="Minha Carteira"
          description="Gerencie seu saldo e extrato"
          color="secondary"
          onClick={() => navigate("/wallet")}
        />
        <QuickCard
          icon={<Package className="h-8 w-8" />}
          title="Meus Pedidos"
          description="Acompanhe suas reservas e compras"
          color="accent"
          onClick={() => navigate("/orders")}
        />
        {isVendedor && (
          <QuickCard
            icon={<Store className="h-8 w-8" />}
            title="Área do Vendedor"
            description="Gerencie suas ofertas e vendas"
            color="primary"
            onClick={() => navigate("/vendor")}
          />
        )}
        {isAdmin && (
          <QuickCard
            icon={<Shield className="h-8 w-8" />}
            title="Painel Admin"
            description="Dashboard e gestão da plataforma"
            color="accent"
            onClick={() => navigate("/admin")}
          />
        )}
      </section>
    </div>
  );
};

function QuickCard({
  icon,
  title,
  description,
  color,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: "primary" | "secondary" | "accent";
  onClick?: () => void;
}) {
  const bgMap = {
    primary: "bg-primary/10 text-primary",
    secondary: "bg-secondary/10 text-secondary",
    accent: "bg-accent/10 text-accent",
  };
  return (
    <div onClick={onClick} className="group cursor-pointer rounded-xl border-2 border-transparent bg-card p-6 shadow-sm transition-all hover:border-primary/30 hover:shadow-md">
      <div className={`mb-4 inline-flex rounded-xl p-3 ${bgMap[color]}`}>{icon}</div>
      <h3 className="font-display text-lg font-bold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export default Index;
