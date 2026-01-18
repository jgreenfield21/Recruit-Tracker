import { createClient } from "@supabase/supabase-js";
import { auth } from "./firebase";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: async (url, options = {}) => {
      const headers = new Headers(options.headers);
      
      if (auth?.currentUser) {
        try {
          const token = await auth.currentUser.getIdToken();
          headers.set("Authorization", `Bearer ${token}`);
        } catch (error) {
          console.error("Failed to get Firebase token for Supabase:", error);
        }
      }
      
      return fetch(url, {
        ...options,
        headers,
      });
    },
  },
});
