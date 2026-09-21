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
      campos_formulario_taller: {
        Row: {
          ayuda: string | null
          clave: string
          etiqueta: string
          id: number
          obligatorio: boolean
          opciones: Json | null
          orden: number
          servicio_id: number | null
          taller_id: number
          tipo: string
          unidad: string | null
        }
        Insert: {
          ayuda?: string | null
          clave: string
          etiqueta: string
          id?: number
          obligatorio?: boolean
          opciones?: Json | null
          orden?: number
          servicio_id?: number | null
          taller_id: number
          tipo: string
          unidad?: string | null
        }
        Update: {
          ayuda?: string | null
          clave?: string
          etiqueta?: string
          id?: number
          obligatorio?: boolean
          opciones?: Json | null
          orden?: number
          servicio_id?: number | null
          taller_id?: number
          tipo?: string
          unidad?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campos_formulario_taller_servicio_id_fkey"
            columns: ["servicio_id"]
            isOneToOne: false
            referencedRelation: "servicios_taller"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campos_formulario_taller_taller_id_fkey"
            columns: ["taller_id"]
            isOneToOne: false
            referencedRelation: "talleres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campos_formulario_taller_taller_id_fkey"
            columns: ["taller_id"]
            isOneToOne: false
            referencedRelation: "talleres_publicos"
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
          {
            foreignKeyName: "festivos_taller_taller_id_fkey"
            columns: ["taller_id"]
            isOneToOne: false
            referencedRelation: "talleres_publicos"
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
          user_id: string | null
          volver_a: string | null
        }
        Insert: {
          created_at?: string
          expires_at: string
          state: string
          taller_id: number
          user_id?: string | null
          volver_a?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          state?: string
          taller_id?: number
          user_id?: string | null
          volver_a?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "google_oauth_states_taller_id_fkey"
            columns: ["taller_id"]
            isOneToOne: false
            referencedRelation: "talleres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "google_oauth_states_taller_id_fkey"
            columns: ["taller_id"]
            isOneToOne: false
            referencedRelation: "talleres_publicos"
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
          {
            foreignKeyName: "horarios_taller_taller_id_fkey"
            columns: ["taller_id"]
            isOneToOne: false
            referencedRelation: "talleres_publicos"
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
          refresh_token: string | null
          refresh_token_secret_id: string | null
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
          refresh_token?: string | null
          refresh_token_secret_id?: string | null
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
          refresh_token?: string | null
          refresh_token_secret_id?: string | null
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
          {
            foreignKeyName: "integraciones_calendario_taller_id_fkey"
            columns: ["taller_id"]
            isOneToOne: false
            referencedRelation: "talleres_publicos"
            referencedColumns: ["id"]
          },
        ]
      }
      miembros_taller: {
        Row: {
          activo: boolean
          created_at: string
          id: number
          nombre: string
          orden: number
          taller_id: number
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: number
          nombre: string
          orden?: number
          taller_id: number
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: number
          nombre?: string
          orden?: number
          taller_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "miembros_taller_taller_id_fkey"
            columns: ["taller_id"]
            isOneToOne: false
            referencedRelation: "talleres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "miembros_taller_taller_id_fkey"
            columns: ["taller_id"]
            isOneToOne: false
            referencedRelation: "talleres_publicos"
            referencedColumns: ["id"]
          },
        ]
      }
      reservas: {
        Row: {
          cancelada_en: string | null
          cancelada_por: string | null
          confirmada_en: string | null
          creada_por: string
          creada_por_miembro: number | null
          created_at: string | null
          datos_extra: Json
          descripcion: string | null
          dia: string
          estado: string
          google_error: string | null
          google_event_html_link: string | null
          google_event_id: string | null
          hora: string
          id: number
          kilometros: number | null
          matricula: string | null
          nombre: string | null
          servicio: string | null
          servicio_id: number | null
          taller_id: number
          telefono: string | null
          token_publico: string
          vehiculo: string | null
          whatsapp_cancelacion_enviada: boolean
          whatsapp_cancelacion_fecha: string | null
          whatsapp_confirmacion_enviada: boolean
          whatsapp_confirmacion_fecha: string | null
          whatsapp_error: string | null
          whatsapp_recordatorio_enviado: boolean
          whatsapp_recordatorio_fecha: string | null
        }
        Insert: {
          cancelada_en?: string | null
          cancelada_por?: string | null
          confirmada_en?: string | null
          creada_por?: string
          creada_por_miembro?: number | null
          created_at?: string | null
          datos_extra?: Json
          descripcion?: string | null
          dia: string
          estado?: string
          google_error?: string | null
          google_event_html_link?: string | null
          google_event_id?: string | null
          hora: string
          id?: number
          kilometros?: number | null
          matricula?: string | null
          nombre?: string | null
          servicio?: string | null
          servicio_id?: number | null
          taller_id: number
          telefono?: string | null
          token_publico?: string
          vehiculo?: string | null
          whatsapp_cancelacion_enviada?: boolean
          whatsapp_cancelacion_fecha?: string | null
          whatsapp_confirmacion_enviada?: boolean
          whatsapp_confirmacion_fecha?: string | null
          whatsapp_error?: string | null
          whatsapp_recordatorio_enviado?: boolean
          whatsapp_recordatorio_fecha?: string | null
        }
        Update: {
          cancelada_en?: string | null
          cancelada_por?: string | null
          confirmada_en?: string | null
          creada_por?: string
          creada_por_miembro?: number | null
          created_at?: string | null
          datos_extra?: Json
          descripcion?: string | null
          dia?: string
          estado?: string
          google_error?: string | null
          google_event_html_link?: string | null
          google_event_id?: string | null
          hora?: string
          id?: number
          kilometros?: number | null
          matricula?: string | null
          nombre?: string | null
          servicio?: string | null
          servicio_id?: number | null
          taller_id?: number
          telefono?: string | null
          token_publico?: string
          vehiculo?: string | null
          whatsapp_cancelacion_enviada?: boolean
          whatsapp_cancelacion_fecha?: string | null
          whatsapp_confirmacion_enviada?: boolean
          whatsapp_confirmacion_fecha?: string | null
          whatsapp_error?: string | null
          whatsapp_recordatorio_enviado?: boolean
          whatsapp_recordatorio_fecha?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservas_creada_por_miembro_fkey"
            columns: ["creada_por_miembro"]
            isOneToOne: false
            referencedRelation: "miembros_taller"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservas_servicio_id_fkey"
            columns: ["servicio_id"]
            isOneToOne: false
            referencedRelation: "servicios_taller"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservas_taller_id_fkey"
            columns: ["taller_id"]
            isOneToOne: false
            referencedRelation: "talleres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservas_taller_id_fkey"
            columns: ["taller_id"]
            isOneToOne: false
            referencedRelation: "talleres_publicos"
            referencedColumns: ["id"]
          },
        ]
      }
      servicios_taller: {
        Row: {
          activo: boolean
          descripcion_ayuda: string | null
          descripcion_etiqueta: string | null
          descripcion_modo: string
          descripcion_placeholder: string | null
          id: number
          imagen_ayuda_url: string | null
          nombre: string
          orden: number
          taller_id: number
        }
        Insert: {
          activo?: boolean
          descripcion_ayuda?: string | null
          descripcion_etiqueta?: string | null
          descripcion_modo?: string
          descripcion_placeholder?: string | null
          id?: number
          imagen_ayuda_url?: string | null
          nombre: string
          orden?: number
          taller_id: number
        }
        Update: {
          activo?: boolean
          descripcion_ayuda?: string | null
          descripcion_etiqueta?: string | null
          descripcion_modo?: string
          descripcion_placeholder?: string | null
          id?: number
          imagen_ayuda_url?: string | null
          nombre?: string
          orden?: number
          taller_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "servicios_taller_taller_id_fkey"
            columns: ["taller_id"]
            isOneToOne: false
            referencedRelation: "talleres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servicios_taller_taller_id_fkey"
            columns: ["taller_id"]
            isOneToOne: false
            referencedRelation: "talleres_publicos"
            referencedColumns: ["id"]
          },
        ]
      }
      talleres: {
        Row: {
          activo: boolean
          capacidad: number
          ciudad: string | null
          created_at: string
          direccion: string | null
          horario_texto: string | null
          id: number
          max_citas_dia: number | null
          modo_capacidad: string
          nombre: string
          numero_resenas: number | null
          slug: string
          telefono: string | null
          texto_aviso_tarde: string | null
          texto_confirmacion: string | null
          texto_whatsapp_cancelacion: string | null
          texto_whatsapp_confirmacion: string | null
          texto_whatsapp_recordatorio: string | null
          user_id: string | null
          valoracion: number | null
          whatsapp_business_account_id: string | null
          whatsapp_modo: string
          whatsapp_phone_number_id: string | null
        }
        Insert: {
          activo?: boolean
          capacidad?: number
          ciudad?: string | null
          created_at?: string
          direccion?: string | null
          horario_texto?: string | null
          id?: number
          max_citas_dia?: number | null
          modo_capacidad?: string
          nombre: string
          numero_resenas?: number | null
          slug: string
          telefono?: string | null
          texto_aviso_tarde?: string | null
          texto_confirmacion?: string | null
          texto_whatsapp_cancelacion?: string | null
          texto_whatsapp_confirmacion?: string | null
          texto_whatsapp_recordatorio?: string | null
          user_id?: string | null
          valoracion?: number | null
          whatsapp_business_account_id?: string | null
          whatsapp_modo?: string
          whatsapp_phone_number_id?: string | null
        }
        Update: {
          activo?: boolean
          capacidad?: number
          ciudad?: string | null
          created_at?: string
          direccion?: string | null
          horario_texto?: string | null
          id?: number
          max_citas_dia?: number | null
          modo_capacidad?: string
          nombre?: string
          numero_resenas?: number | null
          slug?: string
          telefono?: string | null
          texto_aviso_tarde?: string | null
          texto_confirmacion?: string | null
          texto_whatsapp_cancelacion?: string | null
          texto_whatsapp_confirmacion?: string | null
          texto_whatsapp_recordatorio?: string | null
          user_id?: string | null
          valoracion?: number | null
          whatsapp_business_account_id?: string | null
          whatsapp_modo?: string
          whatsapp_phone_number_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      talleres_publicos: {
        Row: {
          capacidad: number | null
          ciudad: string | null
          direccion: string | null
          horario_texto: string | null
          id: number | null
          max_citas_dia: number | null
          modo_capacidad: string | null
          nombre: string | null
          numero_resenas: number | null
          slug: string | null
          telefono: string | null
          texto_aviso_tarde: string | null
          texto_confirmacion: string | null
          valoracion: number | null
          whatsapp_modo: string | null
        }
        Insert: {
          capacidad?: number | null
          ciudad?: string | null
          direccion?: string | null
          horario_texto?: string | null
          id?: number | null
          max_citas_dia?: number | null
          modo_capacidad?: string | null
          nombre?: string | null
          numero_resenas?: number | null
          slug?: string | null
          telefono?: string | null
          texto_aviso_tarde?: string | null
          texto_confirmacion?: string | null
          valoracion?: number | null
          whatsapp_modo?: string | null
        }
        Update: {
          capacidad?: number | null
          ciudad?: string | null
          direccion?: string | null
          horario_texto?: string | null
          id?: number | null
          max_citas_dia?: number | null
          modo_capacidad?: string | null
          nombre?: string | null
          numero_resenas?: number | null
          slug?: string | null
          telefono?: string | null
          texto_aviso_tarde?: string | null
          texto_confirmacion?: string | null
          valoracion?: number | null
          whatsapp_modo?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      cancelar_reserva_cliente: {
        Args: { p_token: string }
        Returns: {
          estado_anterior: string
          google_event_id: string
          reserva_id: number
          taller_id: number
        }[]
      }
      consultar_cita_cliente: {
        Args: { p_token: string }
        Returns: {
          cancelada_por: string
          dia: string
          estado: string
          hora: string
          limite_cancelacion: string
          matricula: string
          nombre: string
          puede_cancelar: boolean
          servicio: string
          taller_nombre: string
          taller_slug: string
          taller_telefono: string
          vehiculo: string
        }[]
      }
      crear_reserva_publica: {
        Args: {
          p_datos_extra?: Json
          p_descripcion: string
          p_dia: string
          p_hora: string
          p_matricula: string
          p_nombre: string
          p_servicio: string
          p_taller_id: number
          p_telefono: string
          p_vehiculo: string
        }
        Returns: {
          reserva_id: number
          token_publico: string
        }[]
      }
      es_telefono_valido: { Args: { p_telefono: string }; Returns: boolean }
      guardar_token_calendario: {
        Args: {
          p_proveedor: string
          p_refresh_token: string
          p_scope?: string
          p_taller_id: number
        }
        Returns: undefined
      }
      insertar_reserva_taller: {
        Args: {
          p_datos_extra?: Json
          p_descripcion: string
          p_dia: string
          p_hora: string
          p_matricula: string
          p_miembro_id?: number
          p_nombre: string
          p_servicio: string
          p_taller_id: number
          p_telefono: string
          p_vehiculo: string
        }
        Returns: {
          reserva_id: number
          token_publico: string
        }[]
      }
      leer_token_calendario: {
        Args: { p_proveedor: string; p_taller_id: number }
        Returns: {
          calendar_id: string
          conectado: boolean
          refresh_token: string
        }[]
      }
      normalizar_telefono: { Args: { p_telefono: string }; Returns: string }
      ocupacion_dia: {
        Args: { p_dia: string; p_taller_id: number }
        Returns: {
          hora: string
          total: number
        }[]
      }
      validar_datos_reserva: {
        Args: {
          p_datos_extra: Json
          p_descripcion: string
          p_dia: string
          p_es_taller: boolean
          p_hora: string
          p_matricula: string
          p_servicio: string
          p_taller_id: number
          p_telefono: string
        }
        Returns: {
          datos_extra: Json
          descripcion: string
          matricula: string
          servicio_id: number
          telefono: string
        }[]
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
