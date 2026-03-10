import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useVendor } from "@/hooks/useVendor";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, X, ImageIcon, GripVertical } from "lucide-react";
import { CATEGORY_MAP } from "./OffersMarketplace";
import type { Database } from "@/integrations/supabase/types";

type OfferCategory = Database["public"]["Enums"]["offer_category"];

const MAX_IMAGES = 6;

const formSchema = z.object({
  title: z.string().min(3, "Título deve ter pelo menos 3 caracteres"),
  description: z.string().optional(),
  category: z.string().default("OUTROS"),
  original_price: z.coerce.number().positive("Preço deve ser maior que zero"),
  offer_price: z.coerce.number().positive("Preço deve ser maior que zero"),
  min_quantity: z.coerce.number().int().min(1, "Mínimo de 1"),
  max_per_user: z.coerce.number().int().min(1).optional(),
  end_date: z.string().min(1, "Informe a data de encerramento"),
  delivery_available: z.boolean().default(false),
  delivery_fee: z.coerce.number().min(0).optional(),
  pickup_available: z.boolean().default(true),
  estimated_delivery_time: z.string().optional(),
  city: z.string().optional(),
}).refine((d) => d.offer_price < d.original_price, {
  message: "Preço da oferta deve ser menor que o preço original",
  path: ["offer_price"],
});

type FormValues = z.infer<typeof formSchema>;

interface ImageItem {
  id: string;
  file?: File;
  preview: string;
  existingUrl?: string;
}

function toLocalDatetime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function VendorCreateOffer() {
  const navigate = useNavigate();
  const { id: offerId } = useParams<{ id: string }>();
  const isEdit = !!offerId;
  const { vendor } = useVendor();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [uploading, setUploading] = useState(false);

  const { data: existingOffer, isLoading: loadingOffer } = useQuery({
    queryKey: ["offer-edit", offerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("offers")
        .select("*")
        .eq("id", offerId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: isEdit,
  });

  // Load existing gallery images when editing
  const { data: existingImages } = useQuery({
    queryKey: ["offer-images-edit", offerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("offer_images")
        .select("*")
        .eq("offer_id", offerId!)
        .order("position", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: isEdit,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "OUTROS",
      original_price: 0,
      offer_price: 0,
      min_quantity: 1,
      max_per_user: 5,
      end_date: "",
      delivery_available: false,
      delivery_fee: 0,
      pickup_available: true,
      estimated_delivery_time: "",
      city: "",
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (existingOffer) {
      form.reset({
        title: existingOffer.title,
        description: existingOffer.description ?? "",
        category: existingOffer.category ?? "OUTROS",
        original_price: Number(existingOffer.original_price),
        offer_price: Number(existingOffer.offer_price),
        min_quantity: existingOffer.min_quantity,
        max_per_user: existingOffer.max_per_user ?? undefined,
        end_date: toLocalDatetime(existingOffer.end_date),
        delivery_available: existingOffer.delivery_available ?? false,
        delivery_fee: Number(existingOffer.delivery_fee ?? 0),
        pickup_available: existingOffer.pickup_available ?? true,
        estimated_delivery_time: existingOffer.estimated_delivery_time ?? "",
        city: (existingOffer as any).city ?? "",
      });
    }
  }, [existingOffer, form]);

  // Auto-fill city from vendor when creating new offer
  useEffect(() => {
    if (!isEdit && vendor && (vendor as any).city && !form.getValues("city")) {
      form.setValue("city", (vendor as any).city);
    }
  }, [vendor, isEdit, form]);

  // Populate images from existing offer + gallery
  useEffect(() => {
    if (!isEdit) return;
    const loaded: ImageItem[] = [];
    // Main image from offer
    if (existingOffer?.image_url) {
      loaded.push({ id: "main", preview: existingOffer.image_url, existingUrl: existingOffer.image_url });
    }
    // Gallery images
    if (existingImages) {
      for (const img of existingImages) {
        if (!loaded.some((l) => l.existingUrl === img.image_url)) {
          loaded.push({ id: img.id, preview: img.image_url, existingUrl: img.image_url });
        }
      }
    }
    if (loaded.length > 0) setImages(loaded);
  }, [existingOffer, existingImages, isEdit]);

  const compressImage = async (file: File, maxWidth = 1200, quality = 0.8): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas not supported"));
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error("Compression failed"));
            resolve(new File([blob], file.name, { type: "image/webp" }));
          },
          "image/webp",
          quality,
        );
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = URL.createObjectURL(file);
    });
  };

  const uploadSingleImage = async (file: File): Promise<string> => {
    if (!vendor) throw new Error("Vendor not found");
    const compressed = await compressImage(file);
    const path = `${vendor.user_id}/${crypto.randomUUID()}.webp`;
    const { error } = await supabase.storage
      .from("offer-images")
      .upload(path, compressed, { upsert: true });
    if (error) throw error;
    const { data: urlData } = supabase.storage
      .from("offer-images")
      .getPublicUrl(path);
    return urlData.publicUrl;
  };

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!vendor) throw new Error("Vendor not found");
      setUploading(true);

      try {
        // Upload any new images
        const resolvedImages: string[] = [];
        for (const img of images) {
          if (img.file) {
            const url = await uploadSingleImage(img.file);
            resolvedImages.push(url);
          } else if (img.existingUrl) {
            resolvedImages.push(img.existingUrl);
          }
        }

        const mainImageUrl = resolvedImages[0] || null;

        const payload = {
          title: values.title,
          description: values.description || null,
          category: values.category as OfferCategory,
          original_price: values.original_price,
          offer_price: values.offer_price,
          min_quantity: values.min_quantity,
          max_per_user: values.max_per_user || null,
          end_date: new Date(values.end_date).toISOString(),
          image_url: mainImageUrl,
          delivery_available: values.delivery_available,
          delivery_fee: values.delivery_fee || 0,
          pickup_available: values.pickup_available,
          estimated_delivery_time: values.estimated_delivery_time || null,
          city: values.city || null,
        };

        let savedOfferId = offerId;

        if (isEdit) {
          const { error } = await supabase
            .from("offers")
            .update(payload)
            .eq("id", offerId!);
          if (error) throw error;
        } else {
          const { data, error } = await supabase
            .from("offers")
            .insert({ ...payload, vendor_id: vendor.id })
            .select("id")
            .single();
          if (error) throw error;
          savedOfferId = data.id;
        }

        // Save gallery images (delete old, insert new)
        if (savedOfferId) {
          await supabase.from("offer_images").delete().eq("offer_id", savedOfferId);
          if (resolvedImages.length > 0) {
            const rows = resolvedImages.map((url, i) => ({
              offer_id: savedOfferId!,
              image_url: url,
              position: i,
            }));
            const { error: imgError } = await supabase.from("offer_images").insert(rows);
            if (imgError) throw imgError;
          }
        }
      } finally {
        setUploading(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offers-active"] });
      queryClient.invalidateQueries({ queryKey: ["vendor-offers"] });
      queryClient.invalidateQueries({ queryKey: ["offer-edit", offerId] });
      queryClient.invalidateQueries({ queryKey: ["offer-images"] });
      toast({ title: isEdit ? "Oferta atualizada! ✅" : "Oferta criada com sucesso! 🎉" });
      navigate("/vendor/my-offers");
    },
    onError: (err: any) => {
      toast({ title: isEdit ? "Erro ao atualizar oferta" : "Erro ao criar oferta", description: err.message, variant: "destructive" });
    },
  });

  const onSubmit = (values: FormValues) => saveMutation.mutate(values);

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const available = MAX_IMAGES - images.length;
    if (available <= 0) {
      toast({ title: `Máximo de ${MAX_IMAGES} imagens`, variant: "destructive" });
      return;
    }

    const toAdd = files.slice(0, available);
    const newItems: ImageItem[] = [];

    for (const file of toAdd) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "Arquivo muito grande", description: `${file.name} excede 5MB`, variant: "destructive" });
        continue;
      }
      newItems.push({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
      });
    }

    setImages((prev) => [...prev, ...newItems]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    setImages((prev) => {
      const next = [...prev];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  useEffect(() => {
    if (vendor && vendor.status !== "APROVADO") {
      navigate("/vendor", { replace: true });
    }
  }, [vendor, navigate]);

  if (!vendor || vendor.status !== "APROVADO") {
    return (
      <AppLayout title="Carregando...">
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  if (isEdit && loadingOffer) {
    return (
      <AppLayout title="Carregando...">
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={isEdit ? "Editar Oferta" : "Nova Oferta"}>
      <main className="container max-w-2xl py-6 space-y-6">
        <Button variant="ghost" size="sm" className="gap-1" onClick={() => navigate("/vendor/my-offers")}>
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>

        <div>
          <h1 className="font-display text-2xl font-bold">{isEdit ? "Editar Oferta" : "Criar Oferta"}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isEdit ? "Atualize os dados da sua oferta" : "Preencha os dados da sua oferta coletiva"}
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Title */}
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>Título *</FormLabel>
                <FormControl><Input placeholder="Ex: Kit 10 coxinhas artesanais" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Description */}
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição</FormLabel>
                <FormControl><Textarea placeholder="Descreva sua oferta..." rows={3} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Category */}
            <FormField control={form.control} name="category" render={({ field }) => (
              <FormItem>
                <FormLabel>Categoria *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(CATEGORY_MAP).map(([key, { label, icon: Icon }]) => (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {/* Multi-Image Upload */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Imagens da Oferta</Label>
                <span className="text-xs text-muted-foreground">{images.length}/{MAX_IMAGES}</span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFilesChange}
              />

              {/* Image grid */}
              {images.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {images.map((img, index) => (
                    <div key={img.id} className="relative group rounded-lg overflow-hidden border bg-muted aspect-square">
                      <img src={img.preview} alt={`Imagem ${index + 1}`} className="h-full w-full object-cover" />
                      {index === 0 && (
                        <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                          Principal
                        </span>
                      )}
                      <div className="absolute inset-0 bg-background/0 group-hover:bg-background/40 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                        {index > 0 && (
                          <button type="button" onClick={() => moveImage(index, -1)} className="rounded-full bg-background/80 p-1 hover:bg-background">
                            <ChevronLeftIcon className="h-4 w-4" />
                          </button>
                        )}
                        {index < images.length - 1 && (
                          <button type="button" onClick={() => moveImage(index, 1)} className="rounded-full bg-background/80 p-1 hover:bg-background">
                            <ChevronRightIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeImage(img.id)}
                        className="absolute top-1 right-1 rounded-full bg-background/80 p-1 hover:bg-background transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add button */}
              {images.length < MAX_IMAGES && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-32 rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                >
                  <ImageIcon className="h-7 w-7" />
                  <span className="text-sm font-medium">
                    {images.length === 0 ? "Clique para enviar imagens" : "Adicionar mais imagens"}
                  </span>
                  <span className="text-xs">PNG, JPG ou WEBP (máx. 5MB cada) — até {MAX_IMAGES} imagens</span>
                </button>
              )}
            </div>

            {/* City */}
            <FormField control={form.control} name="city" render={({ field }) => (
              <FormItem>
                <FormLabel>Cidade / Localização</FormLabel>
                <FormControl><Input placeholder="Ex: São Paulo, SP" {...field} /></FormControl>
                <FormDescription>Informe a cidade onde a oferta está disponível</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            {/* Prices */}
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="original_price" render={({ field }) => (
                <FormItem>
                  <FormLabel>Preço Original (R$) *</FormLabel>
                  <FormControl><Input type="number" step="0.01" min="0" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="offer_price" render={({ field }) => (
                <FormItem>
                  <FormLabel>Preço da Oferta (R$) *</FormLabel>
                  <FormControl><Input type="number" step="0.01" min="0" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Quantities */}
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="min_quantity" render={({ field }) => (
                <FormItem>
                  <FormLabel>Meta Mínima *</FormLabel>
                  <FormControl><Input type="number" min="1" {...field} /></FormControl>
                  <FormDescription>Reservas para validar</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="max_per_user" render={({ field }) => (
                <FormItem>
                  <FormLabel>Máx por Pessoa</FormLabel>
                  <FormControl><Input type="number" min="1" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* End date */}
            <FormField control={form.control} name="end_date" render={({ field }) => (
              <FormItem>
                <FormLabel>Data de Encerramento *</FormLabel>
                <FormControl><Input type="datetime-local" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Delivery options */}
            <div className="rounded-xl border bg-card p-4 space-y-4">
              <p className="font-display font-bold text-sm">Opções de Entrega</p>

              <FormField control={form.control} name="pickup_available" render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <Label>Retirada no local</Label>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )} />

              <FormField control={form.control} name="delivery_available" render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <Label>Entrega disponível</Label>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )} />

              {form.watch("delivery_available") && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="delivery_fee" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Taxa de Entrega (R$)</FormLabel>
                      <FormControl><Input type="number" step="0.01" min="0" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="estimated_delivery_time" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prazo Estimado</FormLabel>
                      <FormControl><Input placeholder="Ex: 3-5 dias úteis" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              )}
            </div>

            <Button type="submit" className="w-full font-bold" size="lg" disabled={saveMutation.isPending || uploading}>
              {(saveMutation.isPending || uploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {uploading ? "Enviando imagens..." : isEdit ? "Salvar Alterações" : "Publicar Oferta"}
            </Button>
          </form>
        </Form>
      </main>
    </AppLayout>
  );
}

// Simple arrow icons for reordering
function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m15 18-6-6 6-6"/>
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m9 18 6-6-6-6"/>
    </svg>
  );
}
