export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5";
  };
  public: {
    Tables: {
      events: {
        Row: {
          created_at: string | null;
          date: string;
          description: string | null;
          id: string;
          passline_url: string | null;
          thumbnail_url: string | null;
          title: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          date: string;
          description?: string | null;
          id?: string;
          passline_url?: string | null;
          thumbnail_url?: string | null;
          title: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          date?: string;
          description?: string | null;
          id?: string;
          passline_url?: string | null;
          thumbnail_url?: string | null;
          title?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      radio_messages: {
        Row: {
          created_at: string;
          id: string;
          message: string;
          username: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          message: string;
          username: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          message?: string;
          username?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          base_price_usd: number;
          created_at: string | null;
          description: string | null;
          full_description: string | null;
          id: string;
          images: Json | null;
          thumbnail_url: string | null;
          title: string;
          updated_at: string | null;
        };
        Insert: {
          base_price_usd: number;
          created_at?: string | null;
          description?: string | null;
          full_description?: string | null;
          id?: string;
          images?: Json | null;
          thumbnail_url?: string | null;
          title: string;
          updated_at?: string | null;
        };
        Update: {
          base_price_usd?: number;
          created_at?: string | null;
          description?: string | null;
          full_description?: string | null;
          id?: string;
          images?: Json | null;
          thumbnail_url?: string | null;
          title?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      requests: {
        Row: {
          created_at: string | null;
          email: string;
          id: string;
          message: string;
          name: string;
          request_type: string;
          status: string | null;
          phone: string | null;
          currency: string | null;
          investment_range: string | null;
          metadata: Json | null;
        };
        Insert: {
          created_at?: string | null;
          email: string;
          id?: string;
          message: string;
          name: string;
          request_type: string;
          status?: string | null;
          phone?: string | null;
          currency?: string | null;
          investment_range?: string | null;
          metadata?: Json | null;
        };
        Update: {
          created_at?: string | null;
          email?: string;
          id?: string;
          message?: string;
          name?: string;
          request_type?: string;
          status?: string | null;
          phone?: string | null;
          currency?: string | null;
          investment_range?: string | null;
          metadata?: Json | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_request: {
        Args: {
          p_email: string;
          p_message: string;
          p_name: string;
          p_request_type: string;
          p_phone?: string | null;
          p_currency?: string | null;
          p_investment_range?: string | null;
          p_metadata?: Json | null;
        };
        Returns: string;
      };
      get_products: {
        Args: {
          category_filter?: string;
          max_price?: number;
          min_price?: number;
        };
        Returns: {
          base_price_usd: number;
          created_at: string;
          description: string;
          full_description: string;
          id: string;
          images: Json;
          thumbnail_url: string;
          title: string;
          updated_at: string;
        }[];
      };
      get_upcoming_events: {
        Args: { limit_count?: number };
        Returns: {
          created_at: string;
          date: string;
          description: string;
          id: string;
          passline_url: string;
          thumbnail_url: string;
          title: string;
          updated_at: string;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
      DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
      DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R;
    }
    ? R
    : never
  : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I;
    }
    ? I
    : never
  : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U;
    }
    ? U
    : never
  : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
