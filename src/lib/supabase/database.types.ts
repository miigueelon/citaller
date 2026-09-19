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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      configuracion_taller: {
        Row: {
          aviso_tarde: string | null
          created_at: string
          id: number
          max_citas_dia: number
          taller_id: number
        }
        Insert: {
          aviso_tarde?: string | null
          created_at?: string
          id?: number
          max_citas_dia?: number
          taller_id: number
        }
        Update: {
          aviso_tarde?: string | null
          created_at?: string
          id?: number
          max_citas_dia?: number
          taller_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "configuracion_taller_taller_id_fkey"
            columns: ["taller_id"]
            isOneToOne: true
            referencedRelation: "talleres"
            referencedColumns: ["id"]
          },
        ]
      }
      festivos_taller: {
        Row: {
          fecha: string
          id: number
          nombre: string
          taller_id: number
        }
        Insert: {
          fecha: string
          id?: number
          nombre: string
          taller_id: number
        }
        Update: {
          fecha?: string
          id?: number
          nombre?: string
          taller_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "festivos_taller_taller_id_fkey"
            columns: ["taller_id"]
            isOneToOne: false
            referencedRelation: "talleres"
            referencedColumns: ["id"]
          },
        ]
      }
      google_oauth_states: {
        Row: {
          created_at: string
          expires_at: string
          state: string
          taller_id: number
        }
        Insert: {
          created_at?: string
          expires_at: string
          state: string
          taller_id: number
        }
        Update: {
          created_at?: string
          expires_at?: string
          state?: string
          taller_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "google_oauth_states_taller_id_fkey"
            columns: ["taller_id"]
            isOneToOne: false
            referencedRelation: "talleres"
            referencedColumns: ["id"]
          },
        ]
      }
      horarios_taller: {
        Row: {
          aviso_tarde: boolean
          dia_semana: number
          hora: string
          id: number
          taller_id: number
        }
        Insert: {
          aviso_tarde?: boolean
          dia_semana: number
          hora: string
          id?: number
          taller_id: number
        }
        Update: {
          aviso_tarde?: boolean
          dia_semana?: number
          hora?: string
          id?: number
          taller_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "horarios_taller_taller_id_fkey"
            columns: ["taller_id"]
            isOneToOne: false
            referencedRelation: "talleres"
            referencedColumns: ["id"]
          },
        ]
      }
      integraciones_calendario: {
        Row: {
          calendar_id: string
          conectado: boolean
          created_at: string
          id: number
          proveedor: string
          refresh_token: string
          scope: string | null
          taller_id: number
          updated_at: string
        }
        Insert: {
          calendar_id?: string
          conectado?: boolean
          created_at?: string
          id?: number
          proveedor: string
          refresh_token: string
          scope?: string | null
          taller_id: number
          updated_at?: string
        }
        Update: {
          calendar_id?: string
          conectado?: boolean
          created_at?: string
          id?: number
          proveedor?: string
          refresh_token?: string
          scope?: string | null
          taller_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integraciones_calendario_taller_id_fkey"
            columns: ["taller_id"]
            isOneToOne: false
            referencedRelation: "talleres"
            referencedColumns: ["id"]
          },
        ]
      }
      reservas: {
        Row: {
          calendar_event_id: string | null
          calendar_provider: string | null
          calendar_sync_status: string | null
          created_at: string | null
          descripcion: string | null
          dia: string | null
          estado: string | null
          google_event_html_link: string | null
          google_event_id: string | null
          hora: string | null
          id: number
          kilometros: number | null
          matricula: string | null
          nombre: string | null
          servicio: string | null
          taller_id: number | null
          telefono: string | null
          vehiculo: string | null
          whatsapp_confirmacion_enviada: boolean
          whatsapp_confirmacion_fecha: string | null
          whatsapp_recordatorio_enviado: boolean
          whatsapp_recordatorio_fecha: string | null
        }
        Insert: {
          calendar_event_id?: string | null
          calendar_provider?: string | null
          calendar_sync_status?: string | null
          created_at?: string | null
          descripcion?: string | null
          dia?: string | null
          estado?: string | null
          google_event_html_link?: string | null
          google_event_id?: string | null
          hora?: string | null
          id?: number
          kilometros?: number | null
          matricula?: string | null
          nombre?: string | null
          servicio?: string | null
          taller_id?: number | null
          telefono?: string | null
          vehiculo?: string | null
          whatsapp_confirmacion_enviada?: boolean
          whatsapp_confirmacion_fecha?: string | null
          whatsapp_recordatorio_enviado?: boolean
          whatsapp_recordatorio_fecha?: string | null
        }
        Update: {
          calendar_event_id?: string | null
          calendar_provider?: string | null
          calendar_sync_status?: string | null
          created_at?: string | null
          descripcion?: string | null
          dia?: string | null
          estado?: string | null
          google_event_html_link?: string | null
          google_event_id?: string | null
          hora?: string | null
          id?: number
          kilometros?: number | null
          matricula?: string | null
          nombre?: string | null
          servicio?: string | null
          taller_id?: number | null
          telefono?: string | null
          vehiculo?: string | null
          whatsapp_confirmacion_enviada?: boolean
          whatsapp_confirmacion_fecha?: string | null
          whatsapp_recordatorio_enviado?: boolean
          whatsapp_recordatorio_fecha?: string | null
        }
        Relationships: []
      }
      talleres: {
        Row: {
          activo: boolean
          calendar_id: string | null
          calendar_provider: string | null
          capacidad_simultanea: number
          ciudad: string | null
          created_at: string
          direccion: string | null
          horario_texto: string | null
          id: number
          nombre: string
          numero_resenas: number | null
          telefono: string | null
          user_id: string | null
          valoracion: number | null
          whatsapp_activo: boolean
          whatsapp_business_account_id: string | null
          whatsapp_phone_number_id: string | null
        }
        Insert: {
          activo?: boolean
          calendar_id?: string | null
          calendar_provider?: string | null
          capacidad_simultanea?: number
          ciudad?: string | null
          created_at?: string
          direccion?: string | null
          horario_texto?: string | null
          id?: number
          nombre: string
          numero_resenas?: number | null
          telefono?: string | null
          user_id?: string | null
          valoracion?: number | null
          whatsapp_activo?: boolean
          whatsapp_business_account_id?: string | null
          whatsapp_phone_number_id?: string | null
        }
        Update: {
          activo?: boolean
          calendar_id?: string | null
          calendar_provider?: string | null
          capacidad_simultanea?: number
          ciudad?: string | null
          created_at?: string
          direccion?: string | null
          horario_texto?: string | null
          id?: number
          nombre?: string
          numero_resenas?: number | null
          telefono?: string | null
          user_id?: string | null
          valoracion?: number | null
          whatsapp_activo?: boolean
          whatsapp_business_account_id?: string | null
          whatsapp_phone_number_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      crear_reserva_publica: {
        Args: {
          p_descripcion: string
          p_dia: string
          p_hora: string
          p_kilometros?: number
          p_matricula: string
          p_nombre: string
          p_servicio: string
          p_taller_id: number
          p_telefono: string
          p_vehiculo: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
