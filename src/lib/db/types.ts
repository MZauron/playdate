
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "answers": {
                  Row: {
                    "answered_at": string,"invite_id": string,"kind": Database["public"]['Enums']["answer_kind"],"note": string | null,"pick_end_at": string | null,"pick_start_at": string | null,"reason": Database["public"]['Enums']["decline_reason"] | null,"time_version": number
                  }
                  Insert: {
                    "answered_at"?: string,"invite_id": string,"kind": Database["public"]['Enums']["answer_kind"],"note"?: string | null,"pick_end_at"?: string | null,"pick_start_at"?: string | null,"reason"?: Database["public"]['Enums']["decline_reason"] | null,"time_version": number
                  }
                  Update: {
                    "answered_at"?: string,"invite_id"?: string,"kind"?: Database["public"]['Enums']["answer_kind"],"note"?: string | null,"pick_end_at"?: string | null,"pick_start_at"?: string | null,"reason"?: Database["public"]['Enums']["decline_reason"] | null,"time_version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "answers_invite_id_fkey"
      columns: ["invite_id"]
isOneToOne: true
      referencedRelation: "invites"
      referencedColumns: ["id"]
    }
                  ]
                },"availability_slots": {
                  Row: {
                    "day": string,"playdate_id": string,"slot": Database["public"]['Enums']["day_slot"]
                  }
                  Insert: {
                    "day": string,"playdate_id": string,"slot": Database["public"]['Enums']["day_slot"]
                  }
                  Update: {
                    "day"?: string,"playdate_id"?: string,"slot"?: Database["public"]['Enums']["day_slot"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "availability_slots_playdate_id_fkey"
      columns: ["playdate_id"]
isOneToOne: false
      referencedRelation: "playdates"
      referencedColumns: ["id"]
    }
                  ]
                },"children": {
                  Row: {
                    "age_label": string,"created_at": string,"first_name": string,"id": string,"parent_id": string,"sort": number
                  }
                  Insert: {
                    "age_label": string,"created_at"?: string,"first_name": string,"id"?: string,"parent_id": string,"sort"?: number
                  }
                  Update: {
                    "age_label"?: string,"created_at"?: string,"first_name"?: string,"id"?: string,"parent_id"?: string,"sort"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "children_parent_id_fkey"
      columns: ["parent_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"friends": {
                  Row: {
                    "child_first_name": string | null,"created_at": string,"id": string,"kindred_user_id": string | null,"label": string,"owner_id": string,"parent_name": string,"phone_e164": string,"phone_hash": string
                  }
                  Insert: {
                    "child_first_name"?: string | null,"created_at"?: string,"id"?: string,"kindred_user_id"?: string | null,"label": string,"owner_id": string,"parent_name": string,"phone_e164": string,"phone_hash": string
                  }
                  Update: {
                    "child_first_name"?: string | null,"created_at"?: string,"id"?: string,"kindred_user_id"?: string | null,"label"?: string,"owner_id"?: string,"parent_name"?: string,"phone_e164"?: string,"phone_hash"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "friends_kindred_user_id_fkey"
      columns: ["kindred_user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "friends_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"group_members": {
                  Row: {
                    "friend_id": string,"group_id": string,"owner_id": string
                  }
                  Insert: {
                    "friend_id": string,"group_id": string,"owner_id": string
                  }
                  Update: {
                    "friend_id"?: string,"group_id"?: string,"owner_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "group_members_friend_id_owner_id_fkey"
      columns: ["friend_id","owner_id"]
isOneToOne: false
      referencedRelation: "friends"
      referencedColumns: ["id","owner_id"]
    },{
      foreignKeyName: "group_members_group_id_owner_id_fkey"
      columns: ["group_id","owner_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id","owner_id"]
    }
                  ]
                },"groups": {
                  Row: {
                    "colour": string,"created_at": string,"id": string,"name": string,"owner_id": string
                  }
                  Insert: {
                    "colour"?: string,"created_at"?: string,"id"?: string,"name": string,"owner_id": string
                  }
                  Update: {
                    "colour"?: string,"created_at"?: string,"id"?: string,"name"?: string,"owner_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "groups_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"invites": {
                  Row: {
                    "channel": Database["public"]['Enums']["invite_channel"],"created_at": string,"friend_id": string,"id": string,"invitee_user_id": string | null,"label": Database["public"]['Enums']["invite_label"],"majority_notice_at": string | null,"organizer_id": string,"playdate_id": string,"token_hash": string
                  }
                  Insert: {
                    "channel": Database["public"]['Enums']["invite_channel"],"created_at"?: string,"friend_id": string,"id"?: string,"invitee_user_id"?: string | null,"label"?: Database["public"]['Enums']["invite_label"],"majority_notice_at"?: string | null,"organizer_id": string,"playdate_id": string,"token_hash": string
                  }
                  Update: {
                    "channel"?: Database["public"]['Enums']["invite_channel"],"created_at"?: string,"friend_id"?: string,"id"?: string,"invitee_user_id"?: string | null,"label"?: Database["public"]['Enums']["invite_label"],"majority_notice_at"?: string | null,"organizer_id"?: string,"playdate_id"?: string,"token_hash"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "invites_friend_id_organizer_id_fkey"
      columns: ["friend_id","organizer_id"]
isOneToOne: false
      referencedRelation: "friends"
      referencedColumns: ["id","owner_id"]
    },{
      foreignKeyName: "invites_invitee_user_id_fkey"
      columns: ["invitee_user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invites_playdate_id_organizer_id_fkey"
      columns: ["playdate_id","organizer_id"]
isOneToOne: false
      referencedRelation: "playdates"
      referencedColumns: ["id","organizer_id"]
    }
                  ]
                },"playdates": {
                  Row: {
                    "cancelled_at": string | null,"confirmed_at": string | null,"created_at": string,"end_at": string | null,"final_end_at": string | null,"final_start_at": string | null,"id": string,"links_expire_at": string,"message": string,"mode": Database["public"]['Enums']["time_mode"],"organizer_id": string,"place_address": string | null,"place_name": string | null,"place_provider_id": string | null,"start_at": string | null,"status": Database["public"]['Enums']["playdate_status"],"time_version": number,"timezone": string,"title": string,"updated_at": string
                  }
                  Insert: {
                    "cancelled_at"?: string | null,"confirmed_at"?: string | null,"created_at"?: string,"end_at"?: string | null,"final_end_at"?: string | null,"final_start_at"?: string | null,"id"?: string,"links_expire_at": string,"message": string,"mode": Database["public"]['Enums']["time_mode"],"organizer_id": string,"place_address"?: string | null,"place_name"?: string | null,"place_provider_id"?: string | null,"start_at"?: string | null,"status"?: Database["public"]['Enums']["playdate_status"],"time_version"?: number,"timezone"?: string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "cancelled_at"?: string | null,"confirmed_at"?: string | null,"created_at"?: string,"end_at"?: string | null,"final_end_at"?: string | null,"final_start_at"?: string | null,"id"?: string,"links_expire_at"?: string,"message"?: string,"mode"?: Database["public"]['Enums']["time_mode"],"organizer_id"?: string,"place_address"?: string | null,"place_name"?: string | null,"place_provider_id"?: string | null,"start_at"?: string | null,"status"?: Database["public"]['Enums']["playdate_status"],"time_version"?: number,"timezone"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "playdates_organizer_id_fkey"
      columns: ["organizer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"first_name": string,"id": string,"phone_hash": string | null,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"first_name": string,"id": string,"phone_hash"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"first_name"?: string,"id"?: string,"phone_hash"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"saved_places": {
                  Row: {
                    "address": string | null,"created_at": string,"id": string,"is_favourite": boolean,"name": string,"owner_id": string,"provider_place_id": string | null,"source": Database["public"]['Enums']["place_source"]
                  }
                  Insert: {
                    "address"?: string | null,"created_at"?: string,"id"?: string,"is_favourite"?: boolean,"name": string,"owner_id": string,"provider_place_id"?: string | null,"source": Database["public"]['Enums']["place_source"]
                  }
                  Update: {
                    "address"?: string | null,"created_at"?: string,"id"?: string,"is_favourite"?: boolean,"name"?: string,"owner_id"?: string,"provider_place_id"?: string | null,"source"?: Database["public"]['Enums']["place_source"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "saved_places_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "create_playdate_with_invites":
{ Args: { "p_invites": Json,"p_playdate": Json }; Returns: string
                           },
"create_profile_with_children":
{ Args: { "p_children": Json,"p_first_name": string,"p_id": string,"p_phone_hash": string }; Returns: undefined
                           },
"is_invited_to":
{ Args: { "p_playdate": string }; Returns: boolean
                           },
"is_organizer_of":
{ Args: { "p_playdate": string }; Returns: boolean
                           },
"organizes_for_me":
{ Args: { "p_profile": string }; Returns: boolean
                           }
          }
          Enums: {
            "answer_kind": "yes"|"no"|"pick","day_slot": "morning"|"afternoon"|"evening","decline_reason": "maybe_another_time"|"busy"|"not_feeling_well"|"too_far"|"other_plans","invite_channel": "app"|"text","invite_label": "none"|"updated"|"new_time","place_source": "typed"|"searched","playdate_status": "collecting"|"confirmed"|"cancelled","time_mode": "set_time"|"availability"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "answer_kind": ["yes", "no", "pick"],"day_slot": ["morning", "afternoon", "evening"],"decline_reason": ["maybe_another_time", "busy", "not_feeling_well", "too_far", "other_plans"],"invite_channel": ["app", "text"],"invite_label": ["none", "updated", "new_time"],"place_source": ["typed", "searched"],"playdate_status": ["collecting", "confirmed", "cancelled"],"time_mode": ["set_time", "availability"]
          }
        }
} as const
