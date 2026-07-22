import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, PlayCircle, FileText } from "lucide-react";

const HowToUsePage = () => {
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
                <div className="flex items-center gap-2 text-primary font-medium cursor-pointer hover:underline">
                  <FileText className="h-4 w-4" />
                  <span>Em breve: Baixar PDF</span>
                </div>
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
                <div className="flex items-center gap-2 text-secondary font-medium cursor-pointer hover:underline">
                  <PlayCircle className="h-4 w-4" />
                  <span>Em breve: Ver vídeos</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Dúvidas Frequentes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-semibold">Como funciona o cashback?</h4>
                <p className="text-sm text-muted-foreground">
                  Ao completar uma compra coletiva, parte do valor pode retornar para sua carteira dependendo das condições da oferta.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold">Como realizar um saque?</h4>
                <p className="text-sm text-muted-foreground">
                  Vendedores e franqueados podem solicitar saques via Pix através de suas respectivas áreas de gestão.
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
