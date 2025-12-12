/**
 * Database type definitions for Supabase
 * These types match the schema in supabase/migrations/001_initial_schema.sql
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'regular_user' | 'tenant' | 'owner' | 'super_admin';
export type PaymentStatus = 'paid' | 'pending' | 'overdue';
export type ConceptType = 'invoice_credit' | 'invoice_cash' | 'receipt' | 'credit_note';
export type ReservationStatus = 'pending' | 'confirmed' | 'rejected' | 'cancelled';
export type IncidentStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type IncidentType = 'maintenance' | 'complaint' | 'suggestion';

export interface Database {
  public: {
    Tables: {
      buildings: {
        Row: {
          id: string;
          name: string;
          address: string | null;
          welcome_message_es: string | null;
          welcome_message_en: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          address?: string | null;
          welcome_message_es?: string | null;
          welcome_message_en?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          address?: string | null;
          welcome_message_es?: string | null;
          welcome_message_en?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      units: {
        Row: {
          id: string;
          building_id: string;
          unit_number: string;
          floor: number | null;
          area_sqm: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          building_id: string;
          unit_number: string;
          floor?: number | null;
          area_sqm?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          building_id?: string;
          unit_number?: string;
          floor?: number | null;
          area_sqm?: number | null;
          created_at?: string;
        };
      };
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: UserRole;
          unit_id: string | null;
          building_id: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role?: UserRole;
          unit_id?: string | null;
          building_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: UserRole;
          unit_id?: string | null;
          building_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      permissions: {
        Row: {
          id: string;
          name: string;
          resource: string;
          action: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          resource: string;
          action: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          resource?: string;
          action?: string;
          description?: string | null;
          created_at?: string;
        };
      };
      role_permissions: {
        Row: {
          id: string;
          role: UserRole;
          permission_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          role: UserRole;
          permission_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          role?: UserRole;
          permission_id?: string;
          created_at?: string;
        };
      };
      payments: {
        Row: {
          id: string;
          user_id: string;
          unit_id: string;
          concept_type: ConceptType;
          concept_description: string | null;
          amount: number;
          status: PaymentStatus;
          due_date: string | null;
          payment_date: string | null;
          receipt_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          unit_id: string;
          concept_type: ConceptType;
          concept_description?: string | null;
          amount: number;
          status?: PaymentStatus;
          due_date?: string | null;
          payment_date?: string | null;
          receipt_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          unit_id?: string;
          concept_type?: ConceptType;
          concept_description?: string | null;
          amount?: number;
          status?: PaymentStatus;
          due_date?: string | null;
          payment_date?: string | null;
          receipt_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      amenities: {
        Row: {
          id: string;
          building_id: string;
          name: string;
          type: string;
          display_name_es: string;
          display_name_en: string | null;
          rules_es: string | null;
          rules_en: string | null;
          max_capacity: number | null;
          is_active: boolean;
          requires_deposit: boolean;
          deposit_amount: number | null;
          price_per_hour: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          building_id: string;
          name: string;
          type: string;
          display_name_es: string;
          display_name_en?: string | null;
          rules_es?: string | null;
          rules_en?: string | null;
          max_capacity?: number | null;
          is_active?: boolean;
          requires_deposit?: boolean;
          deposit_amount?: number | null;
          price_per_hour?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          building_id?: string;
          name?: string;
          type?: string;
          display_name_es?: string;
          display_name_en?: string | null;
          rules_es?: string | null;
          rules_en?: string | null;
          max_capacity?: number | null;
          is_active?: boolean;
          requires_deposit?: boolean;
          deposit_amount?: number | null;
          price_per_hour?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      reservations: {
        Row: {
          id: string;
          user_id: string;
          amenity_id: string;
          reservation_date: string;
          start_time: string;
          end_time: string;
          status: ReservationStatus;
          notes: string | null;
          approved_by: string | null;
          approved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amenity_id: string;
          reservation_date: string;
          start_time: string;
          end_time: string;
          status?: ReservationStatus;
          notes?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          amenity_id?: string;
          reservation_date?: string;
          start_time?: string;
          end_time?: string;
          status?: ReservationStatus;
          notes?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      incidents: {
        Row: {
          id: string;
          user_id: string;
          building_id: string;
          type: IncidentType;
          title: string;
          description: string;
          status: IncidentStatus;
          location: string | null;
          priority: string;
          assigned_to: string | null;
          resolved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          building_id: string;
          type: IncidentType;
          title: string;
          description: string;
          status?: IncidentStatus;
          location?: string | null;
          priority?: string;
          assigned_to?: string | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          building_id?: string;
          type?: IncidentType;
          title?: string;
          description?: string;
          status?: IncidentStatus;
          location?: string | null;
          priority?: string;
          assigned_to?: string | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      announcements: {
        Row: {
          id: string;
          building_id: string;
          title_es: string;
          title_en: string | null;
          content_es: string;
          content_en: string | null;
          is_published: boolean;
          published_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          building_id: string;
          title_es: string;
          title_en?: string | null;
          content_es: string;
          content_en?: string | null;
          is_published?: boolean;
          published_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          building_id?: string;
          title_es?: string;
          title_en?: string | null;
          content_es?: string;
          content_en?: string | null;
          is_published?: boolean;
          published_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      documents: {
        Row: {
          id: string;
          building_id: string;
          user_id: string | null;
          title_es: string;
          title_en: string | null;
          description_es: string | null;
          description_en: string | null;
          file_url: string;
          file_type: string | null;
          category: string | null;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          building_id: string;
          user_id?: string | null;
          title_es: string;
          title_en?: string | null;
          description_es?: string | null;
          description_en?: string | null;
          file_url: string;
          file_type?: string | null;
          category?: string | null;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          building_id?: string;
          user_id?: string | null;
          title_es?: string;
          title_en?: string | null;
          description_es?: string | null;
          description_en?: string | null;
          file_url?: string;
          file_type?: string | null;
          category?: string | null;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_units: {
        Row: {
          id: string;
          user_id: string;
          unit_id: string;
          is_primary: boolean;
          relationship_type: string;
          start_date: string | null;
          end_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          unit_id: string;
          is_primary?: boolean;
          relationship_type?: string;
          start_date?: string | null;
          end_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          unit_id?: string;
          is_primary?: boolean;
          relationship_type?: string;
          start_date?: string | null;
          end_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role: UserRole;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role: UserRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: UserRole;
          created_at?: string;
        };
      };
    };
    Views: {
      users_with_primary_unit: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: UserRole;
          unit_id: string | null;
          building_id: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          primary_unit_id: string | null;
          primary_role: UserRole | null;
        };
      };
    };
    Functions: {
      get_user_units: {
        Args: {
          p_user_id: string;
        };
        Returns: {
          unit_id: string;
          unit_number: string;
          building_id: string;
          building_name: string;
          is_primary: boolean;
          relationship_type: string;
          floor: number | null;
          area_sqm: number | null;
        }[];
      };
      get_user_roles: {
        Args: {
          p_user_id: string;
        };
        Returns: {
          role: UserRole;
        }[];
      };
      user_has_role: {
        Args: {
          p_user_id: string;
          p_role: UserRole;
        };
        Returns: boolean;
      };
      get_user_primary_unit: {
        Args: {
          p_user_id: string;
        };
        Returns: string | null;
      };
    };
    Enums: {
      user_role: UserRole;
      payment_status: PaymentStatus;
      concept_type: ConceptType;
      reservation_status: ReservationStatus;
      incident_status: IncidentStatus;
      incident_type: IncidentType;
    };
  };
}
