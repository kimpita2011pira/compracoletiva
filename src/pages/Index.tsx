import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Store, Shield, LogOut, Wallet, Package } from "lucide-react";

const Index = () => {
  const { user, loading, roles, signOut } = useAuth();
  const navigate = useNavigate();

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
            <span className="text-sm text-muted-foreground">{user.email}</span>
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
        />
        <QuickCard
          icon={<Wallet className="h-8 w-8" />}
          title="Minha Carteira"
          description="Gerencie seu saldo e extrato"
          color="secondary"
        />
        <QuickCard
          icon={<Package className="h-8 w-8" />}
          title="Meus Pedidos"
          description="Acompanhe suas reservas e compras"
          color="accent"
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
