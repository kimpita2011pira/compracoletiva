import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, PlayCircle, FileText, WifiOff, ExternalLink } from "lucide-react";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { Skeleton } from "@/components/ui/skeleton";

const HowToUsePage = () => {
  const { data: settings, isLoading } = usePlatformSettings();

  return (
    <AppLayout title="Como Usar">
      <div className="container py-8 animate-in fade-in slide-in-from-bottom-4">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold font-display text-primary">Central de Ajuda</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Aprenda a aproveitar ao máximo a nossa plataforma com manuais detalhados e vídeos explicativos.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Manual do Usuário</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Guia completo passo a passo sobre como se cadastrar, realizar depósitos e comprar ofertas.
                </p>
                {isLoading ? (
                  <Skeleton className="h-6 w-32" />
                ) : settings?.how_to_use_manual_url ? (
                  <a 
                    href={settings.how_to_use_manual_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary font-medium hover:underline"
                  >
                    <FileText className="h-4 w-4" />
                    <span>Acessar Manual</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground font-medium italic">
                    <FileText className="h-4 w-4" />
                    <span>Em breve: Manual PDF</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="p-2 bg-secondary/10 rounded-lg">
                  <PlayCircle className="h-6 w-6 text-secondary" />
                </div>
                <CardTitle>Vídeos Ilustrativos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Assista a tutoriais rápidos sobre as principais funcionalidades da plataforma.
                </p>
                
                {isLoading ? (
                  <Skeleton className="h-48 w-full rounded-lg" />
                ) : settings?.how_to_use_video_url ? (
                  <div className="space-y-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <PlayCircle className="h-4 w-4 text-secondary" />
                      Vídeo Tutorial
                    </h4>
                    <div className="aspect-video rounded-lg overflow-hidden border">
                      <iframe
                        src={settings.how_to_use_video_url.replace("watch?v=", "embed/")}
                        title="Tutorial"
                        className="w-full h-full"
                        allowFullScreen
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground font-medium italic">
                    <PlayCircle className="h-4 w-4" />
                    <span>Em breve: Vídeos tutoriais</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Dúvidas Técnicas e Instalação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2 text-primary">
                  <FileText className="h-4 w-4" />
                  Como instalar no Android (Chrome)?
                </h4>
                <p className="text-sm text-muted-foreground">
                  Toque nos três pontos (menu) no canto superior direito do Chrome e selecione "Instalar aplicativo" ou "Adicionar à tela inicial".
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2 text-primary">
                  <FileText className="h-4 w-4" />
                  Como instalar no iPhone/iOS (Safari)?
                </h4>
                <p className="text-sm text-muted-foreground">
                  Toque no botão "Compartilhar" (ícone de quadrado com seta para cima) na parte inferior do Safari e escolha "Adicionar à Tela de Início".
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2 text-primary">
                  <FileText className="h-4 w-4" />
                  Limpeza de Cache e Erros
                </h4>
                <p className="text-sm text-muted-foreground">
                  Se o app não estiver atualizando ou apresentar tela branca, acesse as configurações do seu navegador, procure por "Limpar dados de navegação" e limpe o "Cache". Isso garante que você está usando a versão mais recente.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2 text-primary">
                  <WifiOff className="h-4 w-4" />
                  Uso Offline (PWA)
                </h4>
                <p className="text-sm text-muted-foreground">
                  Uma das grandes vantagens do nosso App é a capacidade de funcionar parcialmente offline. Se você perder a conexão, poderá continuar visualizando as páginas que já carregou. O app avisará automaticamente quando você estiver sem internet.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default HowToUsePage;
