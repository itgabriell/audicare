import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { initializeUserClinic } from '@/lib/userUtils';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const { toast } = useToast();
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearLocalSession = useCallback(() => {
    console.log("[AuthContext] Clearing invalid session data.");
    setSession(null);
    setUser(null);
  }, []);

  const fetchUserProfile = async (currentSession) => {
    if (!currentSession) return null;
    try {
      let { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentSession.user.id)
        .maybeSingle();

      if (error) {
        console.warn("Failed to fetch profile:", error);
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

      // Relaxed timeout: 15 seconds instead of 5
      const timeoutId = setTimeout(() => {
        if (mounted && loading) {
          console.warn("[Auth] Initialization taking longer than expected. Continuing wait...");
          // We no longer force loading = false or clear the session here.
          // This allows users on slow connections to eventually load.
        }
      }, 15000);

      try {
        console.log("[Auth] Calling getSession...");
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        console.log("[Auth] getSession result:", currentSession ? "Session Found" : "No Session", error ? error : "No Error");

        if (error) throw error;

        if (mounted) {
          if (currentSession) {
            console.log("[Auth] Session found. Fetching user profile...");
            const profile = await fetchUserProfile(currentSession);

            // --- SYNC CLINIC_ID TO METADATA (Performance Fix) ---
            if (profile?.clinic_id && (!currentSession.user.user_metadata?.clinic_id)) {
              console.log("[Auth] Syncing clinic_id to user metadata for cache...");
              supabase.auth.updateUser({
                data: { clinic_id: profile.clinic_id }
              }).catch(e => console.warn("[Auth] Failed to sync metadata:", e));
            }

            if (mounted) {
              setSession(currentSession);
              setUser(profile || currentSession.user);
              console.log("[Auth] Session and User state stabilized.");
            }
          } else {
            setSession(null);
            setUser(null);
          }
        }
      } catch (error) {
        console.error('[Auth] Error in initAuth:', error);
        // Only clear if it's a definitive "bad token" error
        if (error.message && (error.message.includes('Invalid Refresh Token') || error.message.includes('Refresh Token Not Found'))) {
          clearLocalSession();
        }
      } finally {
        clearTimeout(timeoutId);
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;
        console.log("[Auth] Auth state changed:", event);

        if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }

        if (newSession) {
          const userProfile = await fetchUserProfile(newSession);
          if (mounted) {
            setSession(newSession);
            setUser(userProfile || newSession.user);
          }
        } else {
          setSession(null);
          setUser(null);
        }

        if (mounted) setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
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
  }, [clearLocalSession]);

  const signUp = useCallback(async (email, password, options) => {
    const { data, error } = await supabase.auth.signUp({ email, password, options });
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