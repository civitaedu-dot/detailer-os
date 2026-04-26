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
      appointments: {
        Row: {
          appointment_date: string
          appointment_time: string | null
          client_id: string | null
          client_name: string
          created_at: string
          duration_minutes: number | null
          id: string
          notes: string | null
          payment_method: string | null
          service_name: string
          service_value: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          appointment_date: string
          appointment_time?: string | null
          client_id?: string | null
          client_name: string
          created_at?: string
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          service_name: string
          service_value: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          appointment_date?: string
          appointment_time?: string | null
          client_id?: string | null
          client_name?: string
          created_at?: string
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          service_name?: string
          service_value?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_recipients: {
        Row: {
          campaign_id: string
          client_id: string | null
          client_name: string
          client_phone: string
          id: string
          message_sent: string
          return_appointment_id: string | null
          return_date: string | null
          returned: boolean
          sent_at: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          client_id?: string | null
          client_name: string
          client_phone: string
          id?: string
          message_sent: string
          return_appointment_id?: string | null
          return_date?: string | null
          returned?: boolean
          sent_at?: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          client_id?: string | null
          client_name?: string
          client_phone?: string
          id?: string
          message_sent?: string
          return_appointment_id?: string | null
          return_date?: string | null
          returned?: boolean
          sent_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_recipients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_recipients_return_appointment_id_fkey"
            columns: ["return_appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          created_at: string
          filters: Json
          id: string
          message_template: string
          name: string
          objective: string
          scheduled_date: string | null
          scheduled_time: string | null
          sent_at: string | null
          sent_count: number
          status: string
          target_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filters?: Json
          id?: string
          message_template: string
          name: string
          objective?: string
          scheduled_date?: string | null
          scheduled_time?: string | null
          sent_at?: string | null
          sent_count?: number
          status?: string
          target_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: string
          message_template?: string
          name?: string
          objective?: string
          scheduled_date?: string | null
          scheduled_time?: string | null
          sent_at?: string | null
          sent_count?: number
          status?: string
          target_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          month_year: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          month_year: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          month_year?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          birthdate: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          phone: string
          updated_at: string
          user_id: string
          vehicle: string | null
        }
        Insert: {
          birthdate?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          phone: string
          updated_at?: string
          user_id: string
          vehicle?: string | null
        }
        Update: {
          birthdate?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string
          updated_at?: string
          user_id?: string
          vehicle?: string | null
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          address: string | null
          business_name: string | null
          closing_message: string | null
          cnpj: string | null
          created_at: string
          email: string | null
          id: string
          logo_url: string | null
          phone: string | null
          primary_color: string | null
          trade_name: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          address?: string | null
          business_name?: string | null
          closing_message?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          primary_color?: string | null
          trade_name?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          address?: string | null
          business_name?: string | null
          closing_message?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          primary_color?: string | null
          trade_name?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      financial_data: {
        Row: {
          avg_services_per_day: number | null
          created_at: string
          fixed_costs: number
          hours_per_day: number | null
          id: string
          monthly_goal: number | null
          updated_at: string
          use_automatic_goal: boolean
          user_id: string
          variable_costs_percentage: number
          working_days_per_month: number
        }
        Insert: {
          avg_services_per_day?: number | null
          created_at?: string
          fixed_costs?: number
          hours_per_day?: number | null
          id?: string
          monthly_goal?: number | null
          updated_at?: string
          use_automatic_goal?: boolean
          user_id: string
          variable_costs_percentage?: number
          working_days_per_month?: number
        }
        Update: {
          avg_services_per_day?: number | null
          created_at?: string
          fixed_costs?: number
          hours_per_day?: number | null
          id?: string
          monthly_goal?: number | null
          updated_at?: string
          use_automatic_goal?: boolean
          user_id?: string
          variable_costs_percentage?: number
          working_days_per_month?: number
        }
        Relationships: []
      }
      financial_entries: {
        Row: {
          appointment_id: string | null
          client_id: string | null
          client_name: string | null
          created_at: string
          description: string
          entry_date: string
          entry_type: string
          id: string
          is_automatic: boolean
          notes: string | null
          payment_method: string | null
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          appointment_id?: string | null
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          description: string
          entry_date?: string
          entry_type?: string
          id?: string
          is_automatic?: boolean
          notes?: string | null
          payment_method?: string | null
          updated_at?: string
          user_id: string
          value?: number
        }
        Update: {
          appointment_id?: string | null
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          description?: string
          entry_date?: string
          entry_type?: string
          id?: string
          is_automatic?: boolean
          notes?: string | null
          payment_method?: string | null
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "financial_entries_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      fixed_costs: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          user_id: string
          value?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      import_history: {
        Row: {
          created_at: string
          duplicates_found: number
          error_details: Json | null
          errors_found: number
          file_name: string
          id: string
          import_type: string
          imported_records: number
          status: string
          total_records: number
          user_id: string
        }
        Insert: {
          created_at?: string
          duplicates_found?: number
          error_details?: Json | null
          errors_found?: number
          file_name: string
          id?: string
          import_type?: string
          imported_records?: number
          status?: string
          total_records?: number
          user_id: string
        }
        Update: {
          created_at?: string
          duplicates_found?: number
          error_details?: Json | null
          errors_found?: number
          file_name?: string
          id?: string
          import_type?: string
          imported_records?: number
          status?: string
          total_records?: number
          user_id?: string
        }
        Relationships: []
      }
      message_templates: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          is_default: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          appointment_status: boolean
          birthdays: boolean
          created_at: string
          first_visit: boolean
          id: string
          loyalty_milestones: boolean
          no_future_booking: boolean
          retention_15_days: boolean
          retention_30_days: boolean
          retention_45_days: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          appointment_status?: boolean
          birthdays?: boolean
          created_at?: string
          first_visit?: boolean
          id?: string
          loyalty_milestones?: boolean
          no_future_booking?: boolean
          retention_15_days?: boolean
          retention_30_days?: boolean
          retention_45_days?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          appointment_status?: boolean
          birthdays?: boolean
          created_at?: string
          first_visit?: boolean
          id?: string
          loyalty_milestones?: boolean
          no_future_booking?: boolean
          retention_15_days?: boolean
          retention_30_days?: boolean
          retention_45_days?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          category: string
          client_id: string | null
          client_name: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          category?: string
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          read_at?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          category?: string
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      ordens_servico: {
        Row: {
          ano_veiculo: string | null
          cliente_id: string | null
          cliente_nome: string
          cor: string | null
          created_at: string
          descricao_servico: string
          id: string
          modelo_veiculo: string | null
          observacoes: string | null
          placa: string | null
          prioridade: Database["public"]["Enums"]["ordem_prioridade"]
          quilometragem: string | null
          responsavel_id: string | null
          responsavel_nome: string | null
          status: Database["public"]["Enums"]["ordem_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          ano_veiculo?: string | null
          cliente_id?: string | null
          cliente_nome: string
          cor?: string | null
          created_at?: string
          descricao_servico: string
          id?: string
          modelo_veiculo?: string | null
          observacoes?: string | null
          placa?: string | null
          prioridade?: Database["public"]["Enums"]["ordem_prioridade"]
          quilometragem?: string | null
          responsavel_id?: string | null
          responsavel_nome?: string | null
          status?: Database["public"]["Enums"]["ordem_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          ano_veiculo?: string | null
          cliente_id?: string | null
          cliente_nome?: string
          cor?: string | null
          created_at?: string
          descricao_servico?: string
          id?: string
          modelo_veiculo?: string | null
          observacoes?: string | null
          placa?: string | null
          prioridade?: Database["public"]["Enums"]["ordem_prioridade"]
          quilometragem?: string | null
          responsavel_id?: string | null
          responsavel_nome?: string | null
          status?: Database["public"]["Enums"]["ordem_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ordens_servico_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_method_fees: {
        Row: {
          created_at: string
          description: string | null
          fee_percentage: number
          id: string
          method: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          fee_percentage?: number
          id?: string
          method: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          fee_percentage?: number
          id?: string
          method?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      precificacoes: {
        Row: {
          aliquota_imposto: number
          comissao_avista: number
          comissao_parcelado: number
          created_at: string
          custo_mao_obra: number
          custo_material_total: number
          detalhes: Json
          id: string
          margem_lucro: number
          nome_servico: string
          preco_10x: number
          preco_6x: number
          preco_avista: number
          preco_sn: number
          service_id: string | null
          taxa_cartao_10x: number
          taxa_cartao_6x: number
          updated_at: string
          user_id: string
        }
        Insert: {
          aliquota_imposto?: number
          comissao_avista?: number
          comissao_parcelado?: number
          created_at?: string
          custo_mao_obra?: number
          custo_material_total?: number
          detalhes?: Json
          id?: string
          margem_lucro?: number
          nome_servico: string
          preco_10x?: number
          preco_6x?: number
          preco_avista?: number
          preco_sn?: number
          service_id?: string | null
          taxa_cartao_10x?: number
          taxa_cartao_6x?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          aliquota_imposto?: number
          comissao_avista?: number
          comissao_parcelado?: number
          created_at?: string
          custo_mao_obra?: number
          custo_material_total?: number
          detalhes?: Json
          id?: string
          margem_lucro?: number
          nome_servico?: string
          preco_10x?: number
          preco_6x?: number
          preco_avista?: number
          preco_sn?: number
          service_id?: string | null
          taxa_cartao_10x?: number
          taxa_cartao_6x?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          brand: string | null
          category: string
          cost_per_use: number | null
          created_at: string
          current_stock: number
          id: string
          is_active: boolean
          min_stock: number
          name: string
          supplier_id: string | null
          unit: string
          unit_cost: number
          updated_at: string
          user_id: string
          yields_per_unit: number
        }
        Insert: {
          brand?: string | null
          category?: string
          cost_per_use?: number | null
          created_at?: string
          current_stock?: number
          id?: string
          is_active?: boolean
          min_stock?: number
          name: string
          supplier_id?: string | null
          unit?: string
          unit_cost?: number
          updated_at?: string
          user_id: string
          yields_per_unit?: number
        }
        Update: {
          brand?: string | null
          category?: string
          cost_per_use?: number | null
          created_at?: string
          current_stock?: number
          id?: string
          is_active?: boolean
          min_stock?: number
          name?: string
          supplier_id?: string | null
          unit?: string
          unit_cost?: number
          updated_at?: string
          user_id?: string
          yields_per_unit?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ai_interactions_limit: number | null
          ai_interactions_used: number | null
          business_name: string | null
          created_at: string
          id: string
          name: string
          phone: string | null
          plan: string | null
          plan_status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_end: string | null
          trial_start: string | null
          trial_used: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_interactions_limit?: number | null
          ai_interactions_used?: number | null
          business_name?: string | null
          created_at?: string
          id?: string
          name: string
          phone?: string | null
          plan?: string | null
          plan_status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          trial_start?: string | null
          trial_used?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_interactions_limit?: number | null
          ai_interactions_used?: number | null
          business_name?: string | null
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          plan?: string | null
          plan_status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          trial_start?: string | null
          trial_used?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quote_history: {
        Row: {
          action: string
          created_at: string
          field_changed: string | null
          id: string
          new_value: string | null
          old_value: string | null
          quote_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          field_changed?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          quote_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          field_changed?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          quote_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_history_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_items: {
        Row: {
          created_at: string
          description: string | null
          discount_percentage: number
          id: string
          name: string
          quantity: number
          quote_id: string
          service_id: string | null
          sort_order: number
          subtotal: number
          unit: string | null
          unit_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          discount_percentage?: number
          id?: string
          name: string
          quantity?: number
          quote_id: string
          service_id?: string | null
          sort_order?: number
          subtotal?: number
          unit?: string | null
          unit_price?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          discount_percentage?: number
          id?: string
          name?: string
          quantity?: number
          quote_id?: string
          service_id?: string | null
          sort_order?: number
          subtotal?: number
          unit?: string | null
          unit_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_terms_templates: {
        Row: {
          content: string
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          client_address: string | null
          client_company: string | null
          client_document: string | null
          client_email: string | null
          client_id: string | null
          client_name: string
          client_phone: string | null
          converted_to_appointment: boolean | null
          converted_to_entry: boolean | null
          created_at: string
          created_date: string
          delivery_deadline: string | null
          discount_amount: number
          discount_type: string | null
          discount_value: number
          expiry_date: string | null
          id: string
          internal_notes: string | null
          observations: string | null
          payment_conditions: string | null
          quote_number: string
          status: string
          subtotal: number
          tax_amount: number
          tax_percentage: number
          tax_type: string | null
          template: string | null
          terms_conditions: string | null
          title: string | null
          total: number
          total_item_discounts: number
          updated_at: string
          user_id: string
        }
        Insert: {
          client_address?: string | null
          client_company?: string | null
          client_document?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name: string
          client_phone?: string | null
          converted_to_appointment?: boolean | null
          converted_to_entry?: boolean | null
          created_at?: string
          created_date?: string
          delivery_deadline?: string | null
          discount_amount?: number
          discount_type?: string | null
          discount_value?: number
          expiry_date?: string | null
          id?: string
          internal_notes?: string | null
          observations?: string | null
          payment_conditions?: string | null
          quote_number: string
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_percentage?: number
          tax_type?: string | null
          template?: string | null
          terms_conditions?: string | null
          title?: string | null
          total?: number
          total_item_discounts?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          client_address?: string | null
          client_company?: string | null
          client_document?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string
          client_phone?: string | null
          converted_to_appointment?: boolean | null
          converted_to_entry?: boolean | null
          created_at?: string
          created_date?: string
          delivery_deadline?: string | null
          discount_amount?: number
          discount_type?: string | null
          discount_value?: number
          expiry_date?: string | null
          id?: string
          internal_notes?: string | null
          observations?: string | null
          payment_conditions?: string | null
          quote_number?: string
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_percentage?: number
          tax_type?: string | null
          template?: string | null
          terms_conditions?: string | null
          title?: string | null
          total?: number
          total_item_discounts?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          additional_cost: number | null
          calculated_price: number | null
          created_at: string
          default_price: number
          description: string | null
          duration_minutes: number
          estimated_cost: number | null
          id: string
          is_active: boolean
          material_cost: number | null
          name: string
          profit_margin: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          additional_cost?: number | null
          calculated_price?: number | null
          created_at?: string
          default_price?: number
          description?: string | null
          duration_minutes?: number
          estimated_cost?: number | null
          id?: string
          is_active?: boolean
          material_cost?: number | null
          name: string
          profit_margin?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          additional_cost?: number | null
          calculated_price?: number | null
          created_at?: string
          default_price?: number
          description?: string | null
          duration_minutes?: number
          estimated_cost?: number | null
          id?: string
          is_active?: boolean
          material_cost?: number | null
          name?: string
          profit_margin?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          appointment_id: string | null
          created_at: string
          id: string
          movement_type: string
          product_id: string
          quantity: number
          reason: string | null
          user_id: string
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          id?: string
          movement_type?: string
          product_id: string
          quantity: number
          reason?: string | null
          user_id: string
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          id?: string
          movement_type?: string
          product_id?: string
          quantity?: number
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          avg_delivery_days: number | null
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avg_delivery_days?: number | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avg_delivery_days?: number | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      variable_costs: {
        Row: {
          cost_type: string
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          cost_type: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
          value?: number
        }
        Update: {
          cost_type?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      whatsapp_contact_history: {
        Row: {
          category: string
          client_id: string | null
          client_name: string
          contact_result: string | null
          created_at: string
          id: string
          message_sent: string
          template_used: string | null
          user_id: string
        }
        Insert: {
          category?: string
          client_id?: string | null
          client_name: string
          contact_result?: string | null
          created_at?: string
          id?: string
          message_sent: string
          template_used?: string | null
          user_id: string
        }
        Update: {
          category?: string
          client_id?: string | null
          client_name?: string
          contact_result?: string | null
          created_at?: string
          id?: string
          message_sent?: string
          template_used?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_contact_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      ordem_prioridade: "normal" | "urgente"
      ordem_status: "aguardando" | "em_andamento" | "concluido"
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
      app_role: ["admin", "user"],
      ordem_prioridade: ["normal", "urgente"],
      ordem_status: ["aguardando", "em_andamento", "concluido"],
    },
  },
} as const
