export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          city: string
          complement: string | null
          created_at: string
          id: string
          is_default: boolean | null
          label: string | null
          neighborhood: string | null
          number: string | null
          state: string
          street: string
          user_id: string
          zip_code: string
        }
        Insert: {
          city: string
          complement?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          label?: string | null
          neighborhood?: string | null
          number?: string | null
          state: string
          street: string
          user_id: string
          zip_code: string
        }
        Update: {
          city?: string
          complement?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          label?: string | null
          neighborhood?: string | null
          number?: string | null
          state?: string
          street?: string
          user_id?: string
          zip_code?: string
        }
        Relationships: []
      }
      city_licenses: {
        Row: {
          active: boolean | null
          city: string
          created_at: string
          id: string
          partner_email: string | null
          partner_name: string | null
          state: string
        }
        Insert: {
          active?: boolean | null
          city: string
          created_at?: string
          id?: string
          partner_email?: string | null
          partner_name?: string | null
          state: string
        }
        Update: {
          active?: boolean | null
          city?: string
          created_at?: string
          id?: string
          partner_email?: string | null
          partner_name?: string | null
          state?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          reference_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          reference_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          reference_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          created_at: string
          delivery_available: boolean | null
          delivery_fee: number | null
          description: string | null
          end_date: string
          estimated_delivery_time: string | null
          id: string
          image_url: string | null
          max_per_user: number | null
          min_quantity: number
          offer_price: number
          original_price: number
          pickup_available: boolean | null
          sold_quantity: number
          start_date: string
          status: Database["public"]["Enums"]["offer_status"]
          title: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          delivery_available?: boolean | null
          delivery_fee?: number | null
          description?: string | null
          end_date: string
          estimated_delivery_time?: string | null
          id?: string
          image_url?: string | null
          max_per_user?: number | null
          min_quantity?: number
          offer_price: number
          original_price: number
          pickup_available?: boolean | null
          sold_quantity?: number
          start_date?: string
          status?: Database["public"]["Enums"]["offer_status"]
          title: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          delivery_available?: boolean | null
          delivery_fee?: number | null
          description?: string | null
          end_date?: string
          estimated_delivery_time?: string | null
          id?: string
          image_url?: string | null
          max_per_user?: number | null
          min_quantity?: number
          offer_price?: number
          original_price?: number
          pickup_available?: boolean | null
          sold_quantity?: number
          start_date?: string
          status?: Database["public"]["Enums"]["offer_status"]
          title?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address_id: string | null
          created_at: string
          delivery_type: Database["public"]["Enums"]["delivery_type"]
          id: string
          offer_id: string
          quantity: number
          status: Database["public"]["Enums"]["order_status"]
          total_price: number
          unit_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          address_id?: string | null
          created_at?: string
          delivery_type: Database["public"]["Enums"]["delivery_type"]
          id?: string
          offer_id: string
          quantity?: number
          status?: Database["public"]["Enums"]["order_status"]
          total_price: number
          unit_price: number
          updated_at?: string
          user_id: string
        }
        Update: {
          address_id?: string | null
          created_at?: string
          delivery_type?: Database["public"]["Enums"]["delivery_type"]
          id?: string
          offer_id?: string
          quantity?: number
          status?: Database["public"]["Enums"]["order_status"]
          total_price?: number
          unit_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_wallet: {
        Row: {
          balance: number
          id: string
          updated_at: string
        }
        Insert: {
          balance?: number
          id?: string
          updated_at?: string
        }
        Update: {
          balance?: number
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          name: string
          phone: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          id: string
          name: string
          phone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendors: {
        Row: {
          cnpj: string | null
          company_name: string
          created_at: string
          description: string | null
          id: string
          status: Database["public"]["Enums"]["vendor_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          cnpj?: string | null
          company_name: string
          created_at?: string
          description?: string | null
          id?: string
          status?: Database["public"]["Enums"]["vendor_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          cnpj?: string | null
          company_name?: string
          created_at?: string
          description?: string | null
          id?: string
          status?: Database["public"]["Enums"]["vendor_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          reference_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      credit_wallet:
        | {
            Args: {
              p_amount: number
              p_description: string
              p_reference_id: string
              p_wallet_id: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_amount: number
              p_description: string
              p_reference_id?: string
              p_wallet_id: string
            }
            Returns: undefined
          }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      reserve_offer: {
        Args: {
          p_address_id?: string
          p_delivery_type: Database["public"]["Enums"]["delivery_type"]
          p_offer_id: string
          p_quantity: number
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "CLIENTE" | "VENDEDOR" | "ADMIN"
      delivery_type: "DELIVERY" | "RETIRADA"
      offer_status: "ATIVA" | "VALIDADA" | "CANCELADA" | "ENCERRADA"
      order_status: "RESERVADO" | "CONFIRMADO" | "CANCELADO" | "ESTORNADO"
      transaction_type:
        | "DEPOSITO"
        | "RESERVA"
        | "DEBITO"
        | "ESTORNO"
        | "CREDITO"
        | "COMISSAO"
      vendor_status: "PENDENTE" | "APROVADO" | "REJEITADO"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["CLIENTE", "VENDEDOR", "ADMIN"],
      delivery_type: ["DELIVERY", "RETIRADA"],
      offer_status: ["ATIVA", "VALIDADA", "CANCELADA", "ENCERRADA"],
      order_status: ["RESERVADO", "CONFIRMADO", "CANCELADO", "ESTORNADO"],
      transaction_type: [
        "DEPOSITO",
        "RESERVA",
        "DEBITO",
        "ESTORNO",
        "CREDITO",
        "COMISSAO",
      ],
      vendor_status: ["PENDENTE", "APROVADO", "REJEITADO"],
    },
  },
} as const
