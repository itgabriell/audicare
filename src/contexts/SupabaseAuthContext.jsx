import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { initializeUserClinic } from '@/lib/userUtils';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const { toast } = useToast();
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  // Start with true only if we don't have a cached session to check
  const [loading, setLoading] = useState(true);

  const clearLocalSession = () => {
    console.log("[AuthContext] Clearing invalid session data.");
    setSession(null);
    setUser(null);
    // Removed aggressive localStorage loop as it can interfere with Supabase client's own management.
    // relying on supabase.auth.signOut() is preferred.
    // If absolutely needed to hard reset, we can clear specific known keys, but loop is risky.
  };

  const fetchUserProfile = async (currentSession) => {
    if (!currentSession) return null;
    try {
      // Use maybeSingle to avoid errors on 404
      let { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentSession.user.id)
        .maybeSingle();

      if (error) {
        console.warn("Failed to fetch profile:", error);
        // Fallback to basic user data if profile fails (cold start issue mitigation)
        return currentSession.user;
      }

      if (profile && !profile.clinic_id) {
        const updatedProfile = await initializeUserClinic(currentSession.user, profile);
        return { ...currentSession.user, profile: updatedProfile };
      } else {
        return { ...currentSession.user, profile };
      }
    } catch (e) {
      console.error("Error in fetchUserProfile:", e);
      return currentSession.user;
    }
  };

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      console.log("[Auth] Initializing...");

      // Safety timeout in case Supabase hangs
      const timeoutId = setTimeout(() => {
        if (mounted && loading) {
          console.warn("[Auth] Initialization timed out. Forcing load completion.");
          setLoading(false);
          // SAFE FIX: If we timed out and still have no session, clear storage to prevent zombie state on next reload
          // This avoids the infinite loop where the app thinks it has a token but can't verify it.
          // We only do this on TIMEOUT, not on every load.
          if (!session) {
            console.warn("[Auth] Clearing potentially stuck session due to timeout.");
            const storageKey = 'sb-edqvmybfluxgrdhjiujf-auth-token';
            localStorage.removeItem(storageKey);
          }
        }
      }, 5000);

      try {
        console.log("[Auth] Calling getSession...");
        const sessionPromise = supabase.auth.getSession();
        const { data: { session: currentSession }, error } = await sessionPromise;
        console.log("[Auth] getSession result:", currentSession ? "Session Found" : "No Session", error ? error : "No Error");

        if (error) {
          console.error("[Auth] getSession Error:", error);
          throw error;
        }

        if (mounted) {
          if (currentSession) {
            console.log("[Auth] Setting session and user...");
            setSession(currentSession);
            setUser(currentSession.user);

            console.log("[Auth] Fetching user profile...");
            const profile = await fetchUserProfile(currentSession);
            if (mounted && profile) {
              console.log("[Auth] Profile loaded successfully.");
              setUser(profile);
            }
          } else {
            console.log("[Auth] No active session found.");
            setSession(null);
            setUser(null);
          }
        }
      } catch (error) {
        console.error('[Auth] Error in initAuth:', error);
        if (error.message && (error.message.includes('Invalid Refresh Token') || error.message.includes('Refresh Token Not Found'))) {
          console.warn("[Auth] Invalid token detected, clearing.");
          clearLocalSession();
        }
      } finally {
        console.log("[Auth] initAuth finished. Clearing timeout and setting loading=false.");
        clearTimeout(timeoutId);
        if (mounted) setLoading(false);
      }
    };

    // Aggressive session clearing removed to prevent logout on network glitches
    /* 
    const storageKey = 'sb-edqvmybfluxgrdhjiujf-auth-token'; 
    if (!session && localStorage.getItem(storageKey)) {
      console.warn("[Auth] Found auth token but no session. Potentially corrupted. CLEARING.");
      localStorage.removeItem(storageKey);
    }
    */

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;

        if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }

        setSession(newSession);

        if (newSession) {
          // If user is already set (from init), don't wipe it, just update
          if (!user) setUser(newSession.user);

          const userProfile = await fetchUserProfile(newSession);
          if (mounted) setUser(userProfile);
        }

        if (mounted) setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Falha no login",
        description: error.message === "Invalid login credentials" ? "Usuário ou senha inválidos." : error.message,
      });
    }
    return { data, error };
  }, [toast]);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      clearLocalSession();
    }
  }, []);

  const signUp = useCallback(async (email, password, options) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options,
    });
    if (error) {
      toast({
        variant: "destructive",
        title: "Falha no cadastro",
        description: error.message,
      });
    }
    return { data, error };
  }, [toast]);

  const value = useMemo(() => ({
    session,
    user,
    profile: user,
    loading,
    signIn,
    signOut,
    signUp,
  }), [session, user, loading, signIn, signOut, signUp]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};