import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OfferImage {
  id: string;
  offer_id: string;
  image_url: string;
  position: number;
  created_at: string;
}

export function useOfferImages(offerId: string | undefined) {
  return useQuery({
    queryKey: ["offer-images", offerId],
    enabled: !!offerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("offer_images")
        .select("*")
        .eq("offer_id", offerId!)
        .order("position", { ascending: true });
      if (error) throw error;
      return data as OfferImage[];
    },
  });
}
