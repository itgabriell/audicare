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
      try {
        // Check for existing session first
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (mounted) {
          console.log("[Auth] Session retrieved:", currentSession ? "Yes" : "No");
          setSession(currentSession);
          if (currentSession) {
            // Optimistic UI: Set user immediately with session data while fetching profile
            setUser(currentSession.user);

            // Fetch full profile in background
            fetchUserProfile(currentSession).then(fullProfile => {
              if (mounted && fullProfile) setUser(fullProfile);
            });
          }
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
        if (error.message && (error.message.includes('Invalid Refresh Token') || error.message.includes('Refresh Token Not Found'))) {
          clearLocalSession();
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

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