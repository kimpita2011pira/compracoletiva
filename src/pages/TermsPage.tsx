import { AppLayout } from "@/components/AppLayout";

const TermsPage = () => {
  return (
    <AppLayout title="Termos de Uso" isPublic>
      <main className="container max-w-3xl py-10 space-y-8">
        <section>
          <h2 className="font-display text-3xl font-bold">Termos de Uso</h2>
          <p className="mt-2 text-sm text-muted-foreground">Última atualização: Fevereiro de 2026</p>
        </section>

        <section className="space-y-4 text-muted-foreground leading-relaxed">
          <div>
            <h3 className="font-semibold text-foreground text-lg">1. Aceitação dos Termos</h3>
            <p className="mt-2">
              Ao acessar e utilizar a plataforma Compra Coletiva, você concorda com estes Termos de Uso.
              Caso não concorde, não utilize nossos serviços.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-foreground text-lg">2. Cadastro e Conta</h3>
            <p className="mt-2">
              Para utilizar a plataforma, é necessário criar uma conta com informações verdadeiras e
              atualizadas. Você é responsável por manter a segurança de sua conta e senha.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-foreground text-lg">3. Compras Coletivas</h3>
            <p className="mt-2">
              As ofertas publicadas na plataforma possuem quantidade mínima para validação. Ao reservar
              uma oferta, o valor correspondente será debitado de sua carteira. Caso a oferta não atinja
              a quantidade mínima até a data limite, o valor será estornado integralmente.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-foreground text-lg">4. Carteira Digital</h3>
            <p className="mt-2">
              A carteira digital permite depósitos e gerenciamento de saldo para realizar reservas.
              Estornos são processados automaticamente em caso de cancelamento de ofertas.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-foreground text-lg">5. Responsabilidades do Vendedor</h3>
            <p className="mt-2">
              Vendedores são responsáveis pela qualidade e entrega dos produtos e serviços ofertados.
              A plataforma atua como intermediária e não se responsabiliza por problemas entre
              vendedores e compradores.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-foreground text-lg">6. Política de Privacidade</h3>
            <p className="mt-2">
              Seus dados pessoais são protegidos conforme a Lei Geral de Proteção de Dados (LGPD).
              Utilizamos suas informações exclusivamente para a operação da plataforma.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-foreground text-lg">7. Contato</h3>
            <p className="mt-2">
              Para dúvidas sobre estes termos, entre em contato pelo e-mail contato@ofertaja.com.
            </p>
          </div>
        </section>
      </main>
    </AppLayout>
  );
};

export default TermsPage;
