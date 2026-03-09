import { AppLayout } from "@/components/AppLayout";

const AboutPage = () => {
  return (
    <AppLayout title="Sobre o Compra Coletiva" isPublic>
      <main className="container max-w-3xl py-10 space-y-8">
        <section>
          <h2 className="font-display text-3xl font-bold">🛒 O que é o Compra Coletiva?</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            O Compra Coletiva é uma plataforma de compra coletiva que conecta consumidores e vendedores locais.
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
            <li><a href="mailto:kimpita2011@gmail.com" className="hover:text-primary transition-colors">📧 kimpita2011@gmail.com</a></li>
            <li><a href="https://wa.me/5519991973737" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">📱 (19) 99197-3737 (WhatsApp)</a></li>
          </ul>
        </section>
      </main>
    </AppLayout>
  );
};

export default AboutPage;
