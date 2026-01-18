import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { getQueryFn, queryClient } from "@/lib/queryClient";
import { auth, isFirebaseConfigured, onAuthChange, signInWithGoogle, signOutUser } from "@/lib/firebase";
import { syncUserToSupabase } from "@/lib/supabaseClient";
import type { User } from "@shared/schema";
import type { User as FirebaseUser } from "firebase/auth";

export function useAuth() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [firebaseLoading, setFirebaseLoading] = useState(isFirebaseConfigured);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    
    const unsubscribe = onAuthChange((user) => {
      setFirebaseUser(user);
      setFirebaseLoading(false);
      if (user) {
        // Sync user to Supabase on login if client is initialized
        syncUserToSupabase(user).catch(err => console.error("Sync error:", err));
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      }
    });
    
    return unsubscribe;
  }, []);

  const { data: user, isLoading: apiLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
  });

  const isLoading = firebaseLoading || apiLoading;
  const isAuthenticated = isFirebaseConfigured ? !!firebaseUser : !!user;

  return {
    user: isFirebaseConfigured ? (firebaseUser ? {
      id: firebaseUser.uid,
      email: firebaseUser.email,
      firstName: firebaseUser.displayName?.split(' ')[0] || null,
      lastName: firebaseUser.displayName?.split(' ').slice(1).join(' ') || null,
      profileImageUrl: firebaseUser.photoURL,
    } as User : null) : user,
    firebaseUser,
    isLoading,
    isAuthenticated,
    isFirebaseConfigured,
    signInWithGoogle,
    signOut: signOutUser,
  };
}
