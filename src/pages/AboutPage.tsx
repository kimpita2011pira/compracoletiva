import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const AboutPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
        <div className="container flex h-16 items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-display text-xl font-bold text-primary">Sobre o OfertaJá</h1>
        </div>
      </header>

      <main className="container max-w-3xl py-10 space-y-8">
        <section>
          <h2 className="font-display text-3xl font-bold">🛒 O que é o OfertaJá?</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            O OfertaJá é uma plataforma de compra coletiva que conecta consumidores e vendedores locais.
            Quanto mais pessoas participam de uma oferta, mais todo mundo economiza! Nossa missão é
            democratizar o acesso a produtos e serviços de qualidade com preços justos.
          </p>
        </section>

        <section>
          <h3 className="font-display text-2xl font-bold">Como funciona?</h3>
          <ul className="mt-4 space-y-3 text-muted-foreground">
            <li className="flex gap-3">
              <span className="text-primary font-bold">1.</span>
              Vendedores criam ofertas com preços especiais para compra coletiva.
            </li>
            <li className="flex gap-3">
              <span className="text-primary font-bold">2.</span>
              Consumidores reservam as ofertas usando seu saldo na carteira.
            </li>
            <li className="flex gap-3">
              <span className="text-primary font-bold">3.</span>
              Quando a quantidade mínima é atingida, a oferta é validada e todos economizam!
            </li>
          </ul>
        </section>

        <section>
          <h3 className="font-display text-2xl font-bold">Contato</h3>
          <p className="mt-4 text-muted-foreground">
            Tem dúvidas ou sugestões? Entre em contato conosco:
          </p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li>📧 contato@ofertaja.com</li>
            <li>📱 (11) 99999-9999</li>
          </ul>
        </section>
      </main>
    </div>
  );
};

export default AboutPage;
