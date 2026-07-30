import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional label to identify where the error happened (ex: "Detalhe da oferta"). */
  area?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Captura erros de renderização para evitar "tela branca".
 * Mostra a mensagem do erro (útil para diagnóstico) e ações de recuperação.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Log explícito para facilitar o diagnóstico no console do navegador.
    console.error(`[ErrorBoundary${this.props.area ? `:${this.props.area}` : ""}]`, error, info.componentStack);
  }

  private handleReset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <div className="space-y-1">
          <h1 className="font-display text-xl font-bold">Algo deu errado ao carregar esta tela</h1>
          <p className="text-sm text-muted-foreground">
            Tente novamente. Se o problema continuar, atualize a página ou limpe o cache do navegador.
          </p>
        </div>
        <pre className="max-w-full overflow-x-auto rounded-lg border bg-muted/50 p-3 text-left text-xs text-muted-foreground">
          {error.message}
        </pre>
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={this.handleReset} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Tentar novamente
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Recarregar página
          </Button>
          <Button variant="ghost" onClick={() => window.location.assign("/offers")}>
            Voltar às ofertas
          </Button>
        </div>
      </div>
    );
  }
}
