import { useEffect } from "react";
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
import { ArrowLeft, Loader2 } from "lucide-react";
import { CATEGORY_MAP } from "./OffersMarketplace";
import type { Database } from "@/integrations/supabase/types";

type OfferCategory = Database["public"]["Enums"]["offer_category"];

const formSchema = z.object({
  title: z.string().min(3, "Título deve ter pelo menos 3 caracteres"),
  description: z.string().optional(),
  category: z.string().default("OUTROS"),
  original_price: z.coerce.number().positive("Preço deve ser maior que zero"),
  offer_price: z.coerce.number().positive("Preço deve ser maior que zero"),
  min_quantity: z.coerce.number().int().min(1, "Mínimo de 1"),
  max_per_user: z.coerce.number().int().min(1).optional(),
  end_date: z.string().min(1, "Informe a data de encerramento"),
  image_url: z.string().url("URL inválida").optional().or(z.literal("")),
  delivery_available: z.boolean().default(false),
  delivery_fee: z.coerce.number().min(0).optional(),
  pickup_available: z.boolean().default(true),
  estimated_delivery_time: z.string().optional(),
}).refine((d) => d.offer_price < d.original_price, {
  message: "Preço da oferta deve ser menor que o preço original",
  path: ["offer_price"],
});

type FormValues = z.infer<typeof formSchema>;

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
      image_url: "",
      delivery_available: false,
      delivery_fee: 0,
      pickup_available: true,
      estimated_delivery_time: "",
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
        image_url: existingOffer.image_url ?? "",
        delivery_available: existingOffer.delivery_available ?? false,
        delivery_fee: Number(existingOffer.delivery_fee ?? 0),
        pickup_available: existingOffer.pickup_available ?? true,
        estimated_delivery_time: existingOffer.estimated_delivery_time ?? "",
      });
    }
  }, [existingOffer, form]);

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!vendor) throw new Error("Vendor not found");
      const payload = {
        title: values.title,
        description: values.description || null,
        category: values.category as OfferCategory,
        original_price: values.original_price,
        offer_price: values.offer_price,
        min_quantity: values.min_quantity,
        max_per_user: values.max_per_user || null,
        end_date: new Date(values.end_date).toISOString(),
        image_url: values.image_url || null,
        delivery_available: values.delivery_available,
        delivery_fee: values.delivery_fee || 0,
        pickup_available: values.pickup_available,
        estimated_delivery_time: values.estimated_delivery_time || null,
      };

      if (isEdit) {
        const { error } = await supabase
          .from("offers")
          .update(payload)
          .eq("id", offerId!);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("offers")
          .insert({ ...payload, vendor_id: vendor.id })
          .select()
          .single();
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offers-active"] });
      queryClient.invalidateQueries({ queryKey: ["vendor-offers"] });
      queryClient.invalidateQueries({ queryKey: ["offer-edit", offerId] });
      toast({ title: isEdit ? "Oferta atualizada! ✅" : "Oferta criada com sucesso! 🎉" });
      navigate("/vendor/my-offers");
    },
    onError: (err: any) => {
      toast({ title: isEdit ? "Erro ao atualizar oferta" : "Erro ao criar oferta", description: err.message, variant: "destructive" });
    },
  });

  const onSubmit = (values: FormValues) => saveMutation.mutate(values);

  if (!vendor || vendor.status !== "APROVADO") {
    navigate("/vendor", { replace: true });
    return null;
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

            {/* Image URL */}
            <FormField control={form.control} name="image_url" render={({ field }) => (
              <FormItem>
                <FormLabel>URL da Imagem</FormLabel>
                <FormControl><Input placeholder="https://exemplo.com/imagem.jpg" {...field} /></FormControl>
                <FormDescription>Insira o link de uma imagem para sua oferta</FormDescription>
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

            <Button type="submit" className="w-full font-bold" size="lg" disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Salvar Alterações" : "Publicar Oferta"}
            </Button>
          </form>
        </Form>
      </main>
    </AppLayout>
  );
}
