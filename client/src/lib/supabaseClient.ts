import { createClient } from "@supabase/supabase-js";
import { auth } from "./firebase";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Log configuration status (without secrets)
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials missing. RLS and user sync may not work correctly.");
}

// Ensure the client is only initialized if the URL is present to avoid runtime errors
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey, {
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
    })
  : null;

/**
 * Syncs the Firebase user to the Supabase 'users' table.
 * This ensures that RLS policies can find a matching record in the 'users' table.
 */
export async function syncUserToSupabase(firebaseUser: any) {
  if (!firebaseUser || !supabase) {
    if (!supabase) {
      console.warn("Supabase client not initialized. Skipping user sync.");
    }
    return;
  }

  const { uid, email, displayName, photoURL } = firebaseUser;
  const firstName = displayName?.split(' ')[0] || null;
  const lastName = displayName?.split(' ').slice(1).join(' ') || null;

  try {
    // Check if user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('id')
      .eq('id', uid)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error("Error checking for existing user in Supabase:", fetchError);
      return;
    }

    if (!existingUser) {
      // Create new user record using Firebase UID as the id column
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: uid,
          email,
          first_name: firstName,
          last_name: lastName,
          profile_image_url: photoURL,
        });

      if (insertError) {
        console.error("Error creating user record in Supabase:", insertError);
      } else {
        console.log("Successfully synced new Firebase user to Supabase");
      }
    }
  } catch (err) {
    console.error("Unexpected error syncing user to Supabase:", err);
  }
}
