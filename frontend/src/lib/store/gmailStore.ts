import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface GmailEmail {
  id: string;
  messageId: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  body: string;
  snippet?: string;
  labels?: string[];
  status: 'unread' | 'read' | 'archived';
  // Fields to match Email type
  client_id?: string;
  created_at: string;
  updated_at: string;
}

interface GmailState {
  emails: GmailEmail[];
  setEmails: (emails: GmailEmail[]) => void;
  addEmails: (emails: GmailEmail[]) => void;
  getEmail: (id: string) => GmailEmail | undefined;
  updateEmailStatus: (id: string, status: GmailEmail['status']) => void;
  clearEmails: () => void;
}

export const useGmailStore = create<GmailState>()(
  persist(
    (set, get) => ({
      emails: [],
      setEmails: (emails) => set({ emails }),
      addEmails: (newEmails) =>
        set((state) => {
          // Merge new emails, avoiding duplicates by ID
          const existingIds = new Set(state.emails.map((e) => e.id));
          const uniqueNewEmails = newEmails.filter((e) => !existingIds.has(e.id));
          return { emails: [...uniqueNewEmails, ...state.emails] };
        }),
      getEmail: (id) => get().emails.find((e) => e.id === id),
      updateEmailStatus: (id, status) =>
        set((state) => ({
          emails: state.emails.map((e) =>
            e.id === id ? { ...e, status } : e
          ),
        })),
      clearEmails: () => set({ emails: [] }),
    }),
    {
      name: 'gmail-storage',
    }
  )
);
