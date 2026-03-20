import { AppLayout } from "@/components/AppLayout";
import { SEOHead } from "@/components/SEOHead";

const PrivacyPage = () => {
  return (
    <AppLayout title="Política de Privacidade" isPublic>
      <SEOHead
        title="Política de Privacidade"
        description="Política de Privacidade do Compra Coletiva. Saiba como coletamos, usamos e protegemos seus dados pessoais em conformidade com a LGPD."
        path="/privacy"
      />
      <main className="container max-w-3xl py-10 space-y-8">
        <header>
          <h1 className="font-display text-3xl font-bold">Política de Privacidade</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            <time dateTime="2026-03">Última atualização: Março de 2026</time>
          </p>
        </header>

        <article className="space-y-4 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="font-semibold text-foreground text-lg">1. Introdução</h2>
            <p className="mt-2">
              A Compra Coletiva ("nós", "nosso" ou "plataforma") está comprometida com a proteção da
              privacidade dos seus usuários. Esta Política de Privacidade descreve como coletamos,
              usamos, armazenamos e protegemos suas informações pessoais, em conformidade com a
              Lei Geral de Proteção de Dados (LGPD – Lei nº 13.709/2018).
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-foreground text-lg">2. Dados que Coletamos</h2>
            <p className="mt-2">Coletamos os seguintes tipos de dados pessoais:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside ml-2">
              <li><strong>Dados de cadastro:</strong> nome completo, e-mail, telefone, WhatsApp, cidade e estado.</li>
              <li><strong>Dados de perfil:</strong> foto de avatar e preferências de notificação.</li>
              <li><strong>Dados de endereço:</strong> rua, número, complemento, bairro, cidade, estado e CEP para entregas.</li>
              <li><strong>Dados financeiros:</strong> histórico de transações na carteira digital, reservas e pedidos.</li>
              <li><strong>Dados de vendedores:</strong> razão social, CNPJ, chave PIX e descrição da empresa.</li>
              <li><strong>Dados de uso:</strong> interações com ofertas, favoritos, avaliações e interesses registrados.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-foreground text-lg">3. Como Utilizamos seus Dados</h2>
            <p className="mt-2">Utilizamos suas informações para:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside ml-2">
              <li>Criar e gerenciar sua conta na plataforma.</li>
              <li>Processar reservas, pedidos e transações financeiras na carteira digital.</li>
              <li>Enviar notificações sobre ofertas, pedidos e atualizações relevantes.</li>
              <li>Enviar mensagens via WhatsApp com informações sobre suas reservas e ofertas.</li>
              <li>Permitir a comunicação entre compradores e vendedores.</li>
              <li>Personalizar sua experiência com base em preferências e localização.</li>
              <li>Prevenir fraudes e garantir a segurança da plataforma.</li>
              <li>Cumprir obrigações legais e regulatórias.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-foreground text-lg">4. Compartilhamento de Dados</h2>
            <p className="mt-2">
              Seus dados pessoais podem ser compartilhados nas seguintes situações:
            </p>
            <ul className="mt-2 space-y-1 list-disc list-inside ml-2">
              <li><strong>Com vendedores:</strong> informações necessárias para a entrega de produtos/serviços reservados.</li>
              <li><strong>Prestadores de serviço:</strong> processadores de pagamento (Mercado Pago), serviços de mensageria (WhatsApp Business API) e infraestrutura de hospedagem.</li>
              <li><strong>Autoridades competentes:</strong> quando exigido por lei ou ordem judicial.</li>
            </ul>
            <p className="mt-2">
              Não vendemos, alugamos ou compartilhamos seus dados com terceiros para fins de marketing.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-foreground text-lg">5. Armazenamento e Segurança</h2>
            <p className="mt-2">
              Seus dados são armazenados em servidores seguros com criptografia em trânsito (TLS/SSL)
              e em repouso. Adotamos medidas técnicas e organizacionais adequadas para proteger suas
              informações contra acesso não autorizado, perda ou destruição.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-foreground text-lg">6. Seus Direitos (LGPD)</h2>
            <p className="mt-2">De acordo com a LGPD, você tem direito a:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside ml-2">
              <li>Confirmar a existência de tratamento de seus dados.</li>
              <li>Acessar seus dados pessoais.</li>
              <li>Corrigir dados incompletos, inexatos ou desatualizados.</li>
              <li>Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários.</li>
              <li>Solicitar a portabilidade dos dados a outro fornecedor.</li>
              <li>Revogar o consentimento a qualquer momento.</li>
              <li>Solicitar a eliminação dos dados tratados com base em consentimento.</li>
            </ul>
            <p className="mt-2">
              Para exercer seus direitos, entre em contato pelo e-mail{" "}
              <a href="mailto:kimpita2011@gmail.com" className="text-primary hover:underline">
                kimpita2011@gmail.com
              </a>.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-foreground text-lg">7. Cookies e Tecnologias de Rastreamento</h2>
            <p className="mt-2">
              Utilizamos cookies e tecnologias similares para manter sua sessão ativa, lembrar suas
              preferências e melhorar a experiência de uso. Você pode gerenciar os cookies nas
              configurações do seu navegador.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-foreground text-lg">8. Retenção de Dados</h2>
            <p className="mt-2">
              Seus dados são mantidos enquanto sua conta estiver ativa ou conforme necessário para
              cumprir obrigações legais. Ao solicitar a exclusão da conta, seus dados serão removidos
              em até 30 dias, exceto aqueles que devam ser retidos por exigência legal.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-foreground text-lg">9. Menores de Idade</h2>
            <p className="mt-2">
              A plataforma não é destinada a menores de 18 anos. Não coletamos intencionalmente dados
              de menores. Caso identifiquemos o cadastro de um menor, a conta será desativada e os
              dados removidos.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-foreground text-lg">10. Alterações nesta Política</h2>
            <p className="mt-2">
              Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos sobre
              alterações significativas por e-mail ou pela plataforma. A data da última atualização
              será sempre indicada no topo deste documento.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-foreground text-lg">11. Contato</h2>
            <p className="mt-2">
              Para dúvidas sobre esta Política de Privacidade ou sobre o tratamento de seus dados,
              entre em contato:
            </p>
            <address className="mt-2 space-y-1 not-italic">
              <p>
                <a href="mailto:kimpita2011@gmail.com" className="hover:text-primary transition-colors">
                  📧 kimpita2011@gmail.com
                </a>
              </p>
              <p>
                <a href="https://wa.me/5519991973737" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                  📱 (19) 99197-3737 (WhatsApp)
                </a>
              </p>
            </address>
          </section>
        </article>
      </main>
    </AppLayout>
  );
};

export default PrivacyPage;
