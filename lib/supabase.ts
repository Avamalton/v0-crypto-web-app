import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          username: string | null
          is_admin: boolean
          created_at: string
        }
        Insert: {
          id: string
          email: string
          username?: string | null
          is_admin?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          username?: string | null
          is_admin?: boolean
          created_at?: string
        }
      }
      tokens: {
        Row: {
          id: string
          name: string
          symbol: string
          price_idr: number
          logo: string | null
          network: string
          wallet_address: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          symbol: string
          price_idr: number
          logo?: string | null
          network: string
          wallet_address: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          symbol?: string
          price_idr?: number
          logo?: string | null
          network?: string
          wallet_address?: string
          is_active?: boolean
          created_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          user_id: string
          type: "buy" | "sell"
          token_id: string
          quantity: number
          total_price: number
          status: "pending" | "confirmed" | "completed" | "failed"
          tx_hash: string | null
          payment_method: string | null
          admin_notes: string | null
          created_at: string
          updated_at: string
          order_number: string | null
          payment_proof: string | null
          admin_wallet_used: string | null
          exchange_rate: number | null
          fees: number | null
          confirmed_at: string | null
          completed_at: string | null
          failed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          type: "buy" | "sell"
          token_id: string
          quantity: number
          total_price: number
          status?: "pending" | "confirmed" | "completed" | "failed"
          tx_hash?: string | null
          payment_method?: string | null
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
          order_number?: string | null
          payment_proof?: string | null
          admin_wallet_used?: string | null
          exchange_rate?: number | null
          fees?: number | null
          confirmed_at?: string | null
          completed_at?: string | null
          failed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          type?: "buy" | "sell"
          token_id?: string
          quantity?: number
          total_price?: number
          status?: "pending" | "confirmed" | "completed" | "failed"
          tx_hash?: string | null
          payment_method?: string | null
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
          order_number?: string | null
          payment_proof?: string | null
          admin_wallet_used?: string | null
          exchange_rate?: number | null
          fees?: number | null
          confirmed_at?: string | null
          completed_at?: string | null
          failed_at?: string | null
        }
      }
      payment_methods: {
        Row: {
          id: string
          name: string
          type: string
          display_name: string
          description: string | null
          qr_code_url: string | null
          account_number: string | null
          account_name: string | null
          bank_name: string | null
          instructions: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          type: string
          display_name: string
          description?: string | null
          qr_code_url?: string | null
          account_number?: string | null
          account_name?: string | null
          bank_name?: string | null
          instructions?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: string
          display_name?: string
          description?: string | null
          qr_code_url?: string | null
          account_number?: string | null
          account_name?: string | null
          bank_name?: string | null
          instructions?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      market_ads: {
        Row: {
          id: string
          title: string
          description: string | null
          type: "buy" | "sell"
          token_id: string
          price_idr: number
          min_amount: number | null
          max_amount: number | null
          payment_methods: string[] | null
          terms: string | null
          is_active: boolean
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          type: "buy" | "sell"
          token_id: string
          price_idr: number
          min_amount?: number | null
          max_amount?: number | null
          payment_methods?: string[] | null
          terms?: string | null
          is_active?: boolean
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          type?: "buy" | "sell"
          token_id?: string
          price_idr?: number
          min_amount?: number | null
          max_amount?: number | null
          payment_methods?: string[] | null
          terms?: string | null
          is_active?: boolean
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
