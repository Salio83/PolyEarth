/**
 * @file types.ts
 * @description Définition des types et interfaces partagés.
 */

export interface User {
  id: number;
  name: string;
  email: string;
  password?: string;
  school: string;
  status: string;
  photo_url: string | null;
  rating: number;
  transaction_count: number;
  is_verified: boolean;
  verification_token: string | null;
  phone?: string | null;
  is_admin?: boolean;
}

export interface Item {
  id: number;
  name: string;
  description: string;
  owner_id: number;
  category: string;
  quality: string;
  photo_url: string | null;
  status: string;
  type: string;
  available_from: string | null;
  available_until: string | null;
}

export interface Transaction {
  id: number;
  item_id: number;
  borrower_id: number;
  owner_id: number;
  start_date: string | null;
  end_date: string | null;
  status: string;
  end_requested_by: number | null;
}

export interface Message {
  id: number;
  item_id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  is_read: boolean;
  type: string;
  loan_id: number | null;
}
