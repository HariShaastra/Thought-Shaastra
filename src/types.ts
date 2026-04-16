export interface User {
  id: number;
  email: string;
  name: string | null;
}

export interface Category {
  id: number;
  user_id: number | null;
  name: string;
  is_default: number;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  data: string; // base64
  size: number;
}

export interface Thought {
  id: number;
  user_id: number | null;
  title: string | null;
  text: string;
  expression: string | null;
  meaning: string | null;
  clarity: string | null;
  is_insight: number;
  reasoning: string | null;
  insight: string | null;
  category_id: number | null;
  category_name: string | null;
  tags: string | null;
  created_at: string;
  updated_at: string;
  parent_id: number | null;
  unlock_at: string | null;
  is_private: number;
  type: 'text' | 'voice';
  audio_data: string | null;
  attachments: string | null; // JSON string of Attachment[]
}

export interface Question {
  id: number;
  user_id: number | null;
  text: string;
  type: 'text' | 'voice';
  audio_data: string | null;
  created_at: string;
}

export interface Connection {
  id: number;
  user_id: number | null;
  thought_a_id: number;
  thought_b_id: number;
}

export interface Purpose {
  id: number;
  user_id: number | null;
  text: string;
  type: 'text' | 'voice';
  audio_data: string | null;
  created_at: string;
  updated_at: string;
}

export interface CategoryStat {
  name: string;
  count: number;
}

export interface Document {
  id: number;
  user_id: number | null;
  title: string;
  description: string | null;
  category_id: number | null;
  category_name: string | null;
  created_at: string;
  updated_at: string;
  is_private: number;
  sections?: DocumentSection[];
  linkedThoughts?: Thought[];
}

export interface DocumentSection {
  id: number;
  document_id: number;
  title: string | null;
  content: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}
