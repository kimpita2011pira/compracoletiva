import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { usePlatformSettings, useUpdatePlatformSettings } from "@/hooks/usePlatformSettings";
import { Settings2, PlayCircle, FileText } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export function AdminPlatformSettings() {
  const { data, isLoading } = usePlatformSettings();
  const update = useUpdatePlatformSettings();
  
  const [fee, setFee] = useState<string>("");
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [manualUrl, setManualUrl] = useState<string>("");

  useEffect(() => {
    if (data) {
      setFee(String(data.monthly_admin_fee ?? 0));
      setVideoUrl(data.how_to_use_video_url ?? "");
      setManualUrl(data.how_to_use_manual_url ?? "");
    }
  }, [data]);

  const handleSaveFee = () => {
    const num = Number(fee.replace(",", "."));
    if (!Number.isFinite(num) || num < 0) {
      toast.error("Informe um valor válido (≥ 0)");
      return;
    }
    update.mutate({ monthly_admin_fee: num }, {
      onSuccess: () => toast.success("Taxa mensal atualizada!"),
      onError: (err) => toast.error(`Erro: ${(err as Error).message}`),
    });
  };

  const handleSaveContent = () => {
    update.mutate({ 
      how_to_use_video_url: videoUrl, 
      how_to_use_manual_url: manualUrl 
    }, {
      onSuccess: () => toast.success("Conteúdo da Central de Ajuda atualizado!"),
      onError: (err) => toast.error(`Erro: ${(err as Error).message}`),
    });
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div className="rounded-2xl border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg font-bold">Taxa de administração mensal</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Valor debitado mensalmente da carteira dos <strong>compradores</strong>.
        </p>
        <div className="space-y-2">
          <Label htmlFor="admin-fee">Valor da taxa (R$)</Label>
          <Input
            id="admin-fee"
            inputMode="decimal"
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            placeholder="0,00"
            disabled={isLoading}
          />
        </div>
        <Button onClick={handleSaveFee} disabled={update.isPending || isLoading} className="font-bold">
          {update.isPending ? "Salvando..." : "Salvar Taxa"}
        </Button>
      </div>

      <div className="rounded-2xl border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <PlayCircle className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg font-bold">Conteúdo da Central de Ajuda</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Gerencie os links dos vídeos tutoriais e do manual de instruções.
        </p>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="video-url">URL do Vídeo (YouTube/Vimeo)</Label>
            <Input
              id="video-url"
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="manual-url">URL do Manual (PDF/Google Drive)</Label>
            <Input
              id="manual-url"
              type="url"
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              placeholder="https://drive.google.com/..."
              disabled={isLoading}
            />
          </div>
        </div>

        <Button onClick={handleSaveContent} disabled={update.isPending || isLoading} className="font-bold">
          {update.isPending ? "Salvando..." : "Salvar Conteúdo"}
        </Button>
      </div>
    </div>
  );
}
