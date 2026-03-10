import { useState } from "react";
import { usePromoBanners } from "@/hooks/usePromoBanners";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";

export function AdminBannerManager() {
  const { banners, isLoading, addBanner, updateBanner, deleteBanner } = usePromoBanners(false);
  const [newMessage, setNewMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const handleAdd = () => {
    const msg = newMessage.trim();
    if (!msg) return;
    addBanner.mutate(msg, {
      onSuccess: () => { setNewMessage(""); toast.success("Banner adicionado!"); },
      onError: (e) => toast.error(e.message),
    });
  };

  const handleSaveEdit = (id: string) => {
    const msg = editText.trim();
    if (!msg) return;
    updateBanner.mutate({ id, message: msg }, {
      onSuccess: () => { setEditingId(null); toast.success("Banner atualizado!"); },
      onError: (e) => toast.error(e.message),
    });
  };

  const handleToggle = (id: string, active: boolean) => {
    updateBanner.mutate({ id, active }, {
      onSuccess: () => toast.success(active ? "Banner ativado" : "Banner desativado"),
      onError: (e) => toast.error(e.message),
    });
  };

  const handleDelete = (id: string) => {
    deleteBanner.mutate(id, {
      onSuccess: () => toast.success("Banner removido!"),
      onError: (e) => toast.error(e.message),
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add new */}
      <div className="flex gap-2">
        <Input
          placeholder="Nova mensagem do banner..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="flex-1"
        />
        <Button onClick={handleAdd} disabled={!newMessage.trim() || addBanner.isPending} className="gap-1.5 shrink-0">
          <Plus className="h-4 w-4" /> Adicionar
        </Button>
      </div>

      {/* List */}
      {banners.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">Nenhum banner cadastrado</p>
      ) : (
        <div className="space-y-3">
          {banners.map((b) => (
            <div key={b.id} className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
              <Switch
                checked={b.active}
                onCheckedChange={(checked) => handleToggle(b.id, checked)}
              />
              <div className="flex-1 min-w-0">
                {editingId === b.id ? (
                  <div className="flex gap-2">
                    <Input
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSaveEdit(b.id)}
                      className="flex-1"
                      autoFocus
                    />
                    <Button size="icon" variant="ghost" onClick={() => handleSaveEdit(b.id)}>
                      <Check className="h-4 w-4 text-success" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <p className={`text-sm truncate ${!b.active ? "text-muted-foreground line-through" : ""}`}>
                    {b.message}
                  </p>
                )}
              </div>
              {editingId !== b.id && (
                <div className="flex gap-1 shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => { setEditingId(b.id); setEditText(b.message); }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(b.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
