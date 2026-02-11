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
      console.log("[Auth] Initializing unified auth check...");

      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('[Auth] getSession error:', error);
          if (error.message?.includes('Invalid Refresh Token')) {
            clearLocalSession();
          }
        }

        if (mounted) {
          if (initialSession) {
            console.log("[Auth] Initial session found. Synchronizing profile...");
            const profile = await fetchUserProfile(initialSession);
            if (mounted) {
              setSession(initialSession);
              setUser(profile || initialSession.user);
            }
          } else {
            console.log("[Auth] No initial session found.");
            setSession(null);
            setUser(null);
          }
        }
      } catch (e) {
        console.error("[Auth] Fatal error during init:", e);
      } finally {
        if (mounted) {
          console.log("[Auth] Initialization complete. Loading set to FALSE.");
          setLoading(false);
        }
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;
        console.log("[Auth] Auth event:", event);

        if (event === 'SIGNED_OUT') {
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
            setLoading(false);
          }
        }
      }
    );

    initAuth();

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