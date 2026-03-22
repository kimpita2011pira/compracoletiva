import { AppLayout } from "@/components/AppLayout";
import { SEOHead } from "@/components/SEOHead";

const TermsPage = () => {
  return (
    <AppLayout title="Termos de Uso" isPublic>
      <SEOHead
        title="Termos de Uso"
        description="Leia os Termos de Uso da plataforma Compra Coletiva. Saiba sobre cadastro, compras coletivas, carteira digital e responsabilidades."
        path="/terms"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Termos de Uso – Compra Coletiva",
          url: "https://compracoletiva.lovable.app/terms",
          description: "Termos de Uso da plataforma Compra Coletiva.",
          dateModified: "2026-02-01",
        }}
      />
      <main className="container max-w-3xl py-10 space-y-8">
        <header>
          <h1 className="font-display text-3xl font-bold">Termos de Uso</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            <time dateTime="2026-02">Última atualização: Fevereiro de 2026</time>
          </p>
        </header>

        <article className="space-y-4 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="font-semibold text-foreground text-lg">1. Aceitação dos Termos</h2>
            <p className="mt-2">
              Ao acessar e utilizar a plataforma Compra Coletiva, você concorda com estes Termos de Uso.
              Caso não concorde, não utilize nossos serviços.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-foreground text-lg">2. Cadastro e Conta</h2>
            <p className="mt-2">
              Para utilizar a plataforma, é necessário criar uma conta com informações verdadeiras e
              atualizadas. Você é responsável por manter a segurança de sua conta e senha.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-foreground text-lg">3. Compras Coletivas</h2>
            <p className="mt-2">
              As ofertas publicadas na plataforma possuem quantidade mínima para validação. Ao reservar
              uma oferta, o valor correspondente será debitado de sua carteira. Caso a oferta não atinja
              a quantidade mínima até a data limite, o valor será estornado integralmente.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-foreground text-lg">4. Carteira Digital</h2>
            <p className="mt-2">
              A carteira digital permite depósitos e gerenciamento de saldo para realizar reservas.
              Estornos são processados automaticamente em caso de cancelamento de ofertas.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-foreground text-lg">5. Responsabilidades do Vendedor</h2>
            <p className="mt-2">
              Vendedores são responsáveis pela qualidade e entrega dos produtos e serviços ofertados.
              A plataforma atua como intermediária e não se responsabiliza por problemas entre
              vendedores e compradores.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-foreground text-lg">6. Política de Privacidade</h2>
            <p className="mt-2">
              Seus dados pessoais são protegidos conforme a Lei Geral de Proteção de Dados (LGPD).
              Utilizamos suas informações exclusivamente para a operação da plataforma. Para mais
              detalhes, consulte nossa{" "}
              <a href="/privacy" className="font-semibold text-primary hover:underline">
                Política de Privacidade
              </a>.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-foreground text-lg">7. Contato</h2>
            <p className="mt-2">
              Para dúvidas sobre estes termos, entre em contato pelo e-mail kimpita2011@gmail.com.
            </p>
          </section>
        </article>
      </main>
    </AppLayout>
  );
};

export default TermsPage;
