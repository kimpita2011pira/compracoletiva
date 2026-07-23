import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { SEOHead } from "@/components/SEOHead";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OfferSuggestions } from "@/components/OfferSuggestions";
import { ShoppingBag, Wallet, Package, HelpCircle } from "lucide-react";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [profileName, setProfileName] = useState<string | null>(null);
  const [showPwaBanner, setShowPwaBanner] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const isDismissed = localStorage.getItem("pwa-banner-dismissed");
    if (!isDismissed) {
      setShowPwaBanner(true);
    }

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setShowPwaBanner(false);
    }
  };

  const dismissBanner = () => {
    localStorage.setItem("pwa-banner-dismissed", "true");
    setShowPwaBanner(false);
  };

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("name")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.name) setProfileName(data.name);
      });
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <AppLayout>
      <SEOHead
        title="Economize em grupo com ofertas locais"
        description="Compra Coletiva conecta você a vendedores da sua cidade. Reserve ofertas em grupo e desbloqueie descontos exclusivos quando mais pessoas participam."
        path="/"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Compra Coletiva",
          url: "https://compracoletiva.lovable.app",
          description: "Plataforma de compra coletiva que conecta consumidores e vendedores locais.",
          potentialAction: {
            "@type": "SearchAction",
            target: "https://compracoletiva.lovable.app/offers?q={search_term_string}",
            "query-input": "required name=search_term_string",
          },
        }}
      />
      <main>
      {/* Alerta de Instalação PWA */}
      {showPwaBanner && (
        <section className="container mt-6">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex flex-col md:flex-row items-center gap-4 text-sm md:text-base relative group">
            <button 
              onClick={dismissBanner}
              className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Fechar aviso"
            >
              <HelpCircle className="h-4 w-4 rotate-45" />
            </button>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <HelpCircle className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 text-muted-foreground leading-relaxed text-center md:text-left">
              Para uma melhor experiência, <span className="font-bold text-primary">instale o app no seu navegador</span>. Mantenha-o atualizado e limpe o cache regularmente para garantir o melhor desempenho.
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              {deferredPrompt && (
                <button
                  onClick={handleInstall}
                  className="flex-1 md:flex-none px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:bg-primary/90 transition-colors"
                >
                  Instalar App
                </button>
              )}
              <button
                onClick={() => navigate("/how-to-use")}
                className="flex-1 md:flex-none px-4 py-2 bg-background border border-input rounded-lg font-semibold text-sm hover:bg-accent transition-colors"
              >
                Como Instalar
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Hero */}
      <section className="container py-12 text-center">
        <p className="text-lg text-muted-foreground">
          Olá, <span className="font-semibold text-foreground">{profileName || "visitante"}</span>! 👋
        </p>
        <h2 className="mt-2 font-display text-4xl font-bold md:text-5xl">
          Ofertas incríveis em{" "}
          <span className="text-primary">compra coletiva</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
          Quanto mais gente compra, mais todo mundo economiza! 🔥
        </p>
      </section>

      {/* Tabs: Início / Sugestões */}
      <section className="container pb-12">
        <Tabs defaultValue="home" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:w-auto md:inline-grid">
            <TabsTrigger value="home">Início</TabsTrigger>
            <TabsTrigger value="suggestions">💡 Sugestões</TabsTrigger>
          </TabsList>

          <TabsContent value="home" className="mt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <QuickCard
                icon={<ShoppingBag className="h-8 w-8" />}
                title="Ofertas"
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
              <QuickCard
                icon={<HelpCircle className="h-8 w-8" />}
                title="Como Usar"
                description="Manuais e vídeos explicativos"
                color="primary"
                onClick={() => navigate("/how-to-use")}
              />
            </div>
          </TabsContent>

          <TabsContent value="suggestions" className="mt-6">
            <OfferSuggestions />
          </TabsContent>
        </Tabs>
      </section>
      </main>
    </AppLayout>
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
