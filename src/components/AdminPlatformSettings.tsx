import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { usePlatformSettings, useUpdatePlatformSettings } from "@/hooks/usePlatformSettings";
import { Settings2, PlayCircle, FileText, Upload, Link, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function AdminPlatformSettings() {
  const { data, isLoading } = usePlatformSettings();
  const update = useUpdatePlatformSettings();
  
  const [fee, setFee] = useState<string>("");
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [manualUrl, setManualUrl] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Limit size to 10MB
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Limite de 10MB.");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `manual_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('platform-settings')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('platform-settings')
        .getPublicUrl(filePath);

      setManualUrl(publicUrl);
      toast.success("Arquivo enviado com sucesso!");
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error("Erro ao enviar arquivo.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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
          Gerencie os vídeos tutoriais e o manual de instruções (link ou arquivo).
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
            <Label>Manual do Usuário</Label>
            <Tabs defaultValue="link" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="link" className="gap-2">
                  <Link className="h-4 w-4" /> Link
                </TabsTrigger>
                <TabsTrigger value="file" className="gap-2">
                  <Upload className="h-4 w-4" /> Arquivo
                </TabsTrigger>
              </TabsList>
              <TabsContent value="link" className="mt-4 space-y-2">
                <Input
                  id="manual-url"
                  type="url"
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  disabled={isLoading}
                />
              </TabsContent>
              <TabsContent value="file" className="mt-4 space-y-4">
                <div className="flex flex-col gap-4 p-4 border-2 border-dashed rounded-lg bg-muted/30">
                  <div className="flex items-center justify-center">
                    <Button 
                      variant="outline" 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading || isLoading}
                      className="gap-2"
                    >
                      {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {isUploading ? "Enviando..." : "Selecionar PDF/Arquivo"}
                    </Button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      onChange={handleFileUpload}
                      accept=".pdf,.doc,.docx"
                    />
                  </div>
                  {manualUrl && manualUrl.includes('/storage/v1/object/public/') && (
                    <div className="flex items-center gap-2 p-2 bg-background border rounded text-xs truncate">
                      <FileText className="h-3 w-3 shrink-0 text-primary" />
                      <span className="truncate">{manualUrl.split('/').pop()}</span>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <Button onClick={handleSaveContent} disabled={update.isPending || isLoading || isUploading} className="font-bold w-full">
          {update.isPending ? "Salvando..." : "Salvar Conteúdo da Central"}
        </Button>
      </div>
    </div>
  );
}
