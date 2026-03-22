import { AppLayout } from "@/components/AppLayout";
import { SEOHead } from "@/components/SEOHead";

const AboutPage = () => {
  return (
    <AppLayout title="Sobre o Compra Coletiva" isPublic>
      <SEOHead
        title="Sobre Nós"
        description="Conheça o Compra Coletiva: a plataforma de compra coletiva que conecta consumidores e vendedores locais. Quanto mais participam, mais todos economizam."
        path="/about"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Compra Coletiva",
          url: "https://compracoletiva.lovable.app",
          description: "Plataforma de compra coletiva que conecta consumidores e vendedores locais.",
          contactPoint: {
            "@type": "ContactPoint",
            email: "kimpita2011@gmail.com",
            telephone: "+5519991973737",
            contactType: "customer service",
          },
        }}
      />
      <main className="container max-w-3xl py-10 space-y-8">
        <article>
          <h1 className="font-display text-3xl font-bold">🛒 O que é o Compra Coletiva?</h1>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            O Compra Coletiva é uma plataforma de compra coletiva que conecta consumidores e vendedores locais.
            Quanto mais pessoas participam de uma oferta, mais todo mundo economiza! Nossa missão é
            democratizar o acesso a produtos e serviços de qualidade com preços justos.
          </p>
        </article>

        <section aria-labelledby="how-it-works">
          <h2 id="how-it-works" className="font-display text-2xl font-bold">Como funciona?</h2>
          <ol className="mt-4 space-y-3 text-muted-foreground list-none">
            <li className="flex gap-3">
              <span className="text-primary font-bold" aria-hidden="true">1.</span>
              Vendedores criam ofertas com preços especiais para compra coletiva.
            </li>
            <li className="flex gap-3">
              <span className="text-primary font-bold" aria-hidden="true">2.</span>
              Consumidores reservam as ofertas usando seu saldo na carteira.
            </li>
            <li className="flex gap-3">
              <span className="text-primary font-bold" aria-hidden="true">3.</span>
              Quando a quantidade mínima é atingida, a oferta é validada e todos economizam!
            </li>
          </ol>
        </section>

        <section aria-labelledby="contact">
          <h2 id="contact" className="font-display text-2xl font-bold">Contato</h2>
          <p className="mt-4 text-muted-foreground">
            Tem dúvidas ou sugestões? Entre em contato conosco:
          </p>
          <address className="mt-2 space-y-1 text-muted-foreground not-italic">
            <p><a href="mailto:kimpita2011@gmail.com" className="hover:text-primary transition-colors">📧 kimpita2011@gmail.com</a></p>
            <p><a href="https://wa.me/5519991973737" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">📱 (19) 99197-3737 (WhatsApp)</a></p>
          </address>
        </section>
      </main>
    </AppLayout>
  );
};

export default AboutPage;
