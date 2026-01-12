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

  const fetchUserProfile = async (session) => {
    if (!session) return null;
    try {
      // Retry mechanism for initial profile fetch to handle transient network errors
      const getProfileWithRetry = async (retries = 3, delay = 1000) => {
        try {
          let { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (error) {
            // If error is transient (like Failed to fetch or PGRST116 race condition), retry
            if (error.message?.includes('Failed to fetch') || error.code === 'PGRST116' || error.status === 500) {
                throw error; 
            }
            // Permanent error
            return { profile: null, error };
          }
          return { profile, error: null };
        } catch (err) {
          if (retries > 0) {
            await new Promise(res => setTimeout(res, delay));
            return getProfileWithRetry(retries - 1, delay * 1.5);
          }
          return { profile: null, error: err };
        }
      };

      const { profile: fetchedProfile, error } = await getProfileWithRetry();

      if (error) {
        console.warn("Failed to fetch profile after retries:", error);
        // Even if profile fetch fails, we return the user object so they aren't locked out entirely,
        // though functionality might be limited.
        return session.user;
      }

      let profile = fetchedProfile;

      if (profile && !profile.clinic_id) {
        const updatedProfile = await initializeUserClinic(session.user, profile);
        return { ...session.user, profile: updatedProfile };
      } else {
        return { ...session.user, profile };
      }
    } catch (e) {
      console.error("Error in fetchUserProfile:", e);
      toast({
        variant: "destructive",
        title: "Erro de conexão",
        description: "Houve um problema ao conectar com o servidor. Verifique sua internet.",
      });
      return session.user;
    }
  };

  useEffect(() => {
    let mounted = true;

    const getSessionAndProfile = async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (mounted) {
            setSession(currentSession);
            if (currentSession) {
              const userProfile = await fetchUserProfile(currentSession);
              if (mounted) setUser(userProfile);
            }
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    getSessionAndProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!mounted) return;
        
        setSession(newSession);
        if (newSession) {
          const userProfile = await fetchUserProfile(newSession);
          if (mounted) setUser(userProfile);
        } else {
          if (mounted) setUser(null);
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
    console.log("[AuthContext:signIn] Attempting to sign in with email:", email);
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
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    } catch (error) {
        if (error.status !== 401 && !error.message?.includes('session not found')) {
            console.error("[AuthContext:signOut] Unexpected error:", error);
        }
    } finally {
        // Clear local state and storage
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('sb-') && key.includes('-auth-token')) {
                localStorage.removeItem(key);
            }
        });
        setUser(null);
        setSession(null);
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
    profile: user?.profile || null, // Expor profile diretamente para facilitar o uso
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