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
  public: {
    Tables: {
      admissoes_historico: {
        Row: {
          created_at: string
          detalhes: Json | null
          evento: string
          id: string
          movimentacao_id: string | null
          user_id: string | null
          user_nome: string | null
        }
        Insert: {
          created_at?: string
          detalhes?: Json | null
          evento: string
          id?: string
          movimentacao_id?: string | null
          user_id?: string | null
          user_nome?: string | null
        }
        Update: {
          created_at?: string
          detalhes?: Json | null
          evento?: string
          id?: string
          movimentacao_id?: string | null
          user_id?: string | null
          user_nome?: string | null
        }
        Relationships: []
      }
      admissoes_movimentacao: {
        Row: {
          cargo: string | null
          colaborador_id: string | null
          colaborador_nome: string | null
          created_at: string
          created_by: string | null
          created_by_nome: string | null
          data_abertura: string
          data_admissao: string | null
          data_final: string | null
          id: string
          observacao: string | null
          setor: string | null
          status: string
          substituido_id: string | null
          substituido_nome: string | null
          tipo: string
          turno: string | null
          updated_at: string
          vaga_id: string | null
        }
        Insert: {
          cargo?: string | null
          colaborador_id?: string | null
          colaborador_nome?: string | null
          created_at?: string
          created_by?: string | null
          created_by_nome?: string | null
          data_abertura?: string
          data_admissao?: string | null
          data_final?: string | null
          id?: string
          observacao?: string | null
          setor?: string | null
          status?: string
          substituido_id?: string | null
          substituido_nome?: string | null
          tipo?: string
          turno?: string | null
          updated_at?: string
          vaga_id?: string | null
        }
        Update: {
          cargo?: string | null
          colaborador_id?: string | null
          colaborador_nome?: string | null
          created_at?: string
          created_by?: string | null
          created_by_nome?: string | null
          data_abertura?: string
          data_admissao?: string | null
          data_final?: string | null
          id?: string
          observacao?: string | null
          setor?: string | null
          status?: string
          substituido_id?: string | null
          substituido_nome?: string | null
          tipo?: string
          turno?: string | null
          updated_at?: string
          vaga_id?: string | null
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          acao: string
          created_at: string
          detalhes: Json | null
          entidade: string
          entidade_id: string | null
          id: string
          resumo: string | null
          rota: string | null
          user_email: string | null
          user_id: string | null
          user_nome: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          detalhes?: Json | null
          entidade: string
          entidade_id?: string | null
          id?: string
          resumo?: string | null
          rota?: string | null
          user_email?: string | null
          user_id?: string | null
          user_nome?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          detalhes?: Json | null
          entidade?: string
          entidade_id?: string | null
          id?: string
          resumo?: string | null
          rota?: string | null
          user_email?: string | null
          user_id?: string | null
          user_nome?: string | null
        }
        Relationships: []
      }
      chamadas: {
        Row: {
          colaborador_id: string
          created_at: string
          data: string
          id: string
          observacao: string | null
          registrado_por: string | null
          registrado_por_nome: string | null
          status: Database["public"]["Enums"]["chamada_status"]
          updated_at: string
        }
        Insert: {
          colaborador_id: string
          created_at?: string
          data: string
          id?: string
          observacao?: string | null
          registrado_por?: string | null
          registrado_por_nome?: string | null
          status: Database["public"]["Enums"]["chamada_status"]
          updated_at?: string
        }
        Update: {
          colaborador_id?: string
          created_at?: string
          data?: string
          id?: string
          observacao?: string | null
          registrado_por?: string | null
          registrado_por_nome?: string | null
          status?: Database["public"]["Enums"]["chamada_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chamadas_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          read: boolean
          recipient_id: string
          sender_id: string
          sender_nome: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          read?: boolean
          recipient_id: string
          sender_id: string
          sender_nome?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          read?: boolean
          recipient_id?: string
          sender_id?: string
          sender_nome?: string | null
        }
        Relationships: []
      }
      colaboradores: {
        Row: {
          admissao: string | null
          bairro: string | null
          cargo: string | null
          cidade: string | null
          colaborador: string
          created_at: string
          created_by: string | null
          data_demissao: string | null
          data_nascimento: string | null
          horario_almoco: string | null
          horario_cafe: string | null
          id: string
          lideranca: string | null
          matricula: string
          observacoes: string | null
          sabado_horario: string | null
          sabado_trabalho: string | null
          setor: string | null
          sexo: Database["public"]["Enums"]["sexo_tipo"] | null
          status: Database["public"]["Enums"]["colaborador_status"]
          subsetor: string | null
          tem_filho: string | null
          tipo_demissao: Database["public"]["Enums"]["tipo_demissao"] | null
          turno: string | null
          updated_at: string
        }
        Insert: {
          admissao?: string | null
          bairro?: string | null
          cargo?: string | null
          cidade?: string | null
          colaborador: string
          created_at?: string
          created_by?: string | null
          data_demissao?: string | null
          data_nascimento?: string | null
          horario_almoco?: string | null
          horario_cafe?: string | null
          id?: string
          lideranca?: string | null
          matricula: string
          observacoes?: string | null
          sabado_horario?: string | null
          sabado_trabalho?: string | null
          setor?: string | null
          sexo?: Database["public"]["Enums"]["sexo_tipo"] | null
          status?: Database["public"]["Enums"]["colaborador_status"]
          subsetor?: string | null
          tem_filho?: string | null
          tipo_demissao?: Database["public"]["Enums"]["tipo_demissao"] | null
          turno?: string | null
          updated_at?: string
        }
        Update: {
          admissao?: string | null
          bairro?: string | null
          cargo?: string | null
          cidade?: string | null
          colaborador?: string
          created_at?: string
          created_by?: string | null
          data_demissao?: string | null
          data_nascimento?: string | null
          horario_almoco?: string | null
          horario_cafe?: string | null
          id?: string
          lideranca?: string | null
          matricula?: string
          observacoes?: string | null
          sabado_horario?: string | null
          sabado_trabalho?: string | null
          setor?: string | null
          sexo?: Database["public"]["Enums"]["sexo_tipo"] | null
          status?: Database["public"]["Enums"]["colaborador_status"]
          subsetor?: string | null
          tem_filho?: string | null
          tipo_demissao?: Database["public"]["Enums"]["tipo_demissao"] | null
          turno?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      domingos_especiais: {
        Row: {
          created_at: string
          created_by: string | null
          data: string
          descricao: string | null
          id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data: string
          descricao?: string | null
          id?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data?: string
          descricao?: string | null
          id?: string
        }
        Relationships: []
      }
      experiencia_notas: {
        Row: {
          colaborador_id: string
          conteudo: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
          user_nome: string | null
        }
        Insert: {
          colaborador_id: string
          conteudo: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          user_nome?: string | null
        }
        Update: {
          colaborador_id?: string
          conteudo?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          user_nome?: string | null
        }
        Relationships: []
      }
      feedback_campanhas: {
        Row: {
          created_at: string
          created_by: string | null
          created_by_nome: string | null
          descricao: string | null
          id: string
          status: string
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          created_by_nome?: string | null
          descricao?: string | null
          id?: string
          status?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          created_by_nome?: string | null
          descricao?: string | null
          id?: string
          status?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      feedback_perguntas: {
        Row: {
          campanha_id: string
          created_at: string
          id: string
          obrigatoria: boolean
          ordem: number
          texto: string
          tipo: string
        }
        Insert: {
          campanha_id: string
          created_at?: string
          id?: string
          obrigatoria?: boolean
          ordem?: number
          texto: string
          tipo?: string
        }
        Update: {
          campanha_id?: string
          created_at?: string
          id?: string
          obrigatoria?: boolean
          ordem?: number
          texto?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_perguntas_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "feedback_campanhas"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_resposta_itens: {
        Row: {
          created_at: string
          id: string
          pergunta_id: string
          resposta_id: string
          valor_nota: number | null
          valor_texto: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          pergunta_id: string
          resposta_id: string
          valor_nota?: number | null
          valor_texto?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          pergunta_id?: string
          resposta_id?: string
          valor_nota?: number | null
          valor_texto?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_resposta_itens_pergunta_id_fkey"
            columns: ["pergunta_id"]
            isOneToOne: false
            referencedRelation: "feedback_perguntas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_resposta_itens_resposta_id_fkey"
            columns: ["resposta_id"]
            isOneToOne: false
            referencedRelation: "feedback_respostas"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_respostas: {
        Row: {
          campanha_id: string
          comentario: string | null
          created_at: string
          id: string
          setor: string | null
          user_id: string | null
          user_nome: string | null
        }
        Insert: {
          campanha_id: string
          comentario?: string | null
          created_at?: string
          id?: string
          setor?: string | null
          user_id?: string | null
          user_nome?: string | null
        }
        Update: {
          campanha_id?: string
          comentario?: string | null
          created_at?: string
          id?: string
          setor?: string | null
          user_id?: string | null
          user_nome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_respostas_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "feedback_campanhas"
            referencedColumns: ["id"]
          },
        ]
      }
      ideias: {
        Row: {
          cargo: string
          created_at: string
          descricao: string
          email: string
          id: string
          nome: string
          status: Database["public"]["Enums"]["ideia_status"]
          titulo: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          cargo: string
          created_at?: string
          descricao: string
          email: string
          id?: string
          nome: string
          status?: Database["public"]["Enums"]["ideia_status"]
          titulo: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          cargo?: string
          created_at?: string
          descricao?: string
          email?: string
          id?: string
          nome?: string
          status?: Database["public"]["Enums"]["ideia_status"]
          titulo?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      movimentacoes: {
        Row: {
          campo: string
          colaborador_id: string
          colaborador_nome: string
          created_at: string
          id: string
          matricula: string
          tipo: string
          user_id: string | null
          user_nome: string | null
          valor_anterior: string | null
          valor_novo: string | null
        }
        Insert: {
          campo: string
          colaborador_id: string
          colaborador_nome: string
          created_at?: string
          id?: string
          matricula: string
          tipo?: string
          user_id?: string | null
          user_nome?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Update: {
          campo?: string
          colaborador_id?: string
          colaborador_nome?: string
          created_at?: string
          id?: string
          matricula?: string
          tipo?: string
          user_id?: string | null
          user_nome?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
      notas: {
        Row: {
          conteudo: string | null
          cor: string | null
          created_at: string
          id: string
          pinned: boolean
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          conteudo?: string | null
          cor?: string | null
          created_at?: string
          id?: string
          pinned?: boolean
          titulo?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          conteudo?: string | null
          cor?: string | null
          created_at?: string
          id?: string
          pinned?: boolean
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pesquisa_perguntas: {
        Row: {
          created_at: string
          id: string
          obrigatoria: boolean
          opcoes: Json | null
          ordem: number
          pesquisa_id: string
          texto: string
          tipo: Database["public"]["Enums"]["pergunta_tipo"]
        }
        Insert: {
          created_at?: string
          id?: string
          obrigatoria?: boolean
          opcoes?: Json | null
          ordem?: number
          pesquisa_id: string
          texto: string
          tipo?: Database["public"]["Enums"]["pergunta_tipo"]
        }
        Update: {
          created_at?: string
          id?: string
          obrigatoria?: boolean
          opcoes?: Json | null
          ordem?: number
          pesquisa_id?: string
          texto?: string
          tipo?: Database["public"]["Enums"]["pergunta_tipo"]
        }
        Relationships: [
          {
            foreignKeyName: "pesquisa_perguntas_pesquisa_id_fkey"
            columns: ["pesquisa_id"]
            isOneToOne: false
            referencedRelation: "pesquisas"
            referencedColumns: ["id"]
          },
        ]
      }
      pesquisas: {
        Row: {
          closed_at: string | null
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          introducao: string | null
          status: Database["public"]["Enums"]["pesquisa_status"]
          tipo: Database["public"]["Enums"]["pesquisa_tipo"]
          titulo: string
          token: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          introducao?: string | null
          status?: Database["public"]["Enums"]["pesquisa_status"]
          tipo?: Database["public"]["Enums"]["pesquisa_tipo"]
          titulo: string
          token?: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          introducao?: string | null
          status?: Database["public"]["Enums"]["pesquisa_status"]
          tipo?: Database["public"]["Enums"]["pesquisa_tipo"]
          titulo?: string
          token?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          nome: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id: string
          nome?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      respostas_item: {
        Row: {
          created_at: string
          id: string
          pergunta_id: string
          resposta_id: string
          valor_nota: number | null
          valor_opcoes: Json | null
          valor_texto: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          pergunta_id: string
          resposta_id: string
          valor_nota?: number | null
          valor_opcoes?: Json | null
          valor_texto?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          pergunta_id?: string
          resposta_id?: string
          valor_nota?: number | null
          valor_opcoes?: Json | null
          valor_texto?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "respostas_item_pergunta_id_fkey"
            columns: ["pergunta_id"]
            isOneToOne: false
            referencedRelation: "pesquisa_perguntas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "respostas_item_resposta_id_fkey"
            columns: ["resposta_id"]
            isOneToOne: false
            referencedRelation: "respostas_pesquisa"
            referencedColumns: ["id"]
          },
        ]
      }
      respostas_pesquisa: {
        Row: {
          comentario: string | null
          created_at: string
          id: string
          lideranca: string | null
          nota: number | null
          pesquisa_id: string
          setor: string | null
        }
        Insert: {
          comentario?: string | null
          created_at?: string
          id?: string
          lideranca?: string | null
          nota?: number | null
          pesquisa_id: string
          setor?: string | null
        }
        Update: {
          comentario?: string | null
          created_at?: string
          id?: string
          lideranca?: string | null
          nota?: number | null
          pesquisa_id?: string
          setor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "respostas_pesquisa_pesquisa_id_fkey"
            columns: ["pesquisa_id"]
            isOneToOne: false
            referencedRelation: "pesquisas"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitacoes: {
        Row: {
          aprovador_id: string | null
          aprovador_nome: string | null
          colaborador_id: string
          colaborador_nome: string
          created_at: string
          decided_at: string | null
          descricao: string
          id: string
          matricula: string
          motivo: string | null
          observacao_aprovador: string | null
          solicitante_id: string | null
          solicitante_nome: string | null
          status: Database["public"]["Enums"]["solicitacao_status"]
          tipo: Database["public"]["Enums"]["solicitacao_tipo"]
          valor_atual: string | null
          valor_solicitado: string | null
        }
        Insert: {
          aprovador_id?: string | null
          aprovador_nome?: string | null
          colaborador_id: string
          colaborador_nome: string
          created_at?: string
          decided_at?: string | null
          descricao: string
          id?: string
          matricula: string
          motivo?: string | null
          observacao_aprovador?: string | null
          solicitante_id?: string | null
          solicitante_nome?: string | null
          status?: Database["public"]["Enums"]["solicitacao_status"]
          tipo: Database["public"]["Enums"]["solicitacao_tipo"]
          valor_atual?: string | null
          valor_solicitado?: string | null
        }
        Update: {
          aprovador_id?: string | null
          aprovador_nome?: string | null
          colaborador_id?: string
          colaborador_nome?: string
          created_at?: string
          decided_at?: string | null
          descricao?: string
          id?: string
          matricula?: string
          motivo?: string | null
          observacao_aprovador?: string | null
          solicitante_id?: string | null
          solicitante_nome?: string | null
          status?: Database["public"]["Enums"]["solicitacao_status"]
          tipo?: Database["public"]["Enums"]["solicitacao_tipo"]
          valor_atual?: string | null
          valor_solicitado?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
        ]
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
          role?: Database["public"]["Enums"]["app_role"]
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
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "gestor" | "usuario"
      chamada_status:
        | "Presente"
        | "Folga"
        | "Falta"
        | "Atestado"
        | "Ferias"
        | "Afastado"
        | "Licenca"
      colaborador_status: "Ativo" | "Demitido" | "Afastado" | "Ferias"
      ideia_status:
        | "em_analise"
        | "em_andamento"
        | "aprovado"
        | "concluido"
        | "rejeitado"
      pergunta_tipo:
        | "nota_0_10"
        | "escolha_unica"
        | "escolha_multipla"
        | "texto_curto"
        | "texto_longo"
      pesquisa_status: "aberta" | "fechada"
      pesquisa_tipo: "enps" | "clima" | "lideranca" | "pulse"
      sexo_tipo: "Masculino" | "Feminino"
      solicitacao_status: "pendente" | "aprovada" | "rejeitada" | "cancelada"
      solicitacao_tipo:
        | "transferencia_setor"
        | "mudanca_turno"
        | "mudanca_cargo"
        | "mudanca_lideranca"
        | "desligamento"
        | "outro"
      tipo_demissao:
        | "Pedido de demissao"
        | "Sem justa causa"
        | "Com justa causa"
        | "Acordo"
        | "Fim de contrato"
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
      app_role: ["admin", "gestor", "usuario"],
      chamada_status: [
        "Presente",
        "Folga",
        "Falta",
        "Atestado",
        "Ferias",
        "Afastado",
        "Licenca",
      ],
      colaborador_status: ["Ativo", "Demitido", "Afastado", "Ferias"],
      ideia_status: [
        "em_analise",
        "em_andamento",
        "aprovado",
        "concluido",
        "rejeitado",
      ],
      pergunta_tipo: [
        "nota_0_10",
        "escolha_unica",
        "escolha_multipla",
        "texto_curto",
        "texto_longo",
      ],
      pesquisa_status: ["aberta", "fechada"],
      pesquisa_tipo: ["enps", "clima", "lideranca", "pulse"],
      sexo_tipo: ["Masculino", "Feminino"],
      solicitacao_status: ["pendente", "aprovada", "rejeitada", "cancelada"],
      solicitacao_tipo: [
        "transferencia_setor",
        "mudanca_turno",
        "mudanca_cargo",
        "mudanca_lideranca",
        "desligamento",
        "outro",
      ],
      tipo_demissao: [
        "Pedido de demissao",
        "Sem justa causa",
        "Com justa causa",
        "Acordo",
        "Fim de contrato",
      ],
    },
  },
} as const
