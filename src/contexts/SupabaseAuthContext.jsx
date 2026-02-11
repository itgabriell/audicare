import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { initializeUserClinic } from '@/lib/userUtils';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const { toast } = useToast();
  // --- OPTIMISTIC HYDRATION ---
  // Try to load a cached profile immediately to speed up UI rendering
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(() => {
    try {
      const cached = localStorage.getItem('audicare_user_profile');
      return cached ? JSON.parse(cached) : null;
    } catch { return null; }
  });
  const [loading, setLoading] = useState(true);
  const [slowLoading, setSlowLoading] = useState(false);

  // Helper to update user and cache simultaneously
  const updateUserData = useCallback((userData) => {
    setUser(userData);
    if (userData) {
      localStorage.setItem('audicare_user_profile', JSON.stringify(userData));
    } else {
      localStorage.removeItem('audicare_user_profile');
    }
  }, []);

  const clearLocalSession = useCallback(() => {
    console.log("[AuthContext] Clearing invalid session data.");
    setSession(null);
    updateUserData(null);
    // Deep wipe via cacheManager
    import('@/utils/cacheManager').then(({ cacheManager }) => cacheManager.clearAll());
  }, [updateUserData]);

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

      let finalUserObject = currentSession.user;
      if (profile) {
        if (!profile.clinic_id) {
          const updatedProfile = await initializeUserClinic(currentSession.user, profile);
          finalUserObject = { ...currentSession.user, profile: updatedProfile };
        } else {
          finalUserObject = { ...currentSession.user, profile };
        }
      }

      // Sync to cache
      updateUserData(finalUserObject);
      return finalUserObject;
    } catch (e) {
      console.error("Error in fetchUserProfile:", e);
      return currentSession.user;
    }
  };

  // Allow manual profile refresh from settings
  const refreshProfile = useCallback(async () => {
    if (!session) return;
    console.log("[Auth] Manually refreshing profile cache...");
    return await fetchUserProfile(session);
  }, [session]);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      console.log("[Auth] Initializing unified auth check...");

      // Slow load feedback timer (8s)
      const slowLoadId = setTimeout(() => {
        if (mounted && loading) setSlowLoading(true);
      }, 8000);

      // Hard Fail-safe: If after 15 seconds we are still "loading", force it to false
      const failSafeId = setTimeout(() => {
        if (mounted) {
          console.error("[Auth] Initial load hard timeout (15s). Releasing UI...");
          setLoading(false);
          setSlowLoading(false);
        }
      }, 15000);

      try {
        // Standard session recovery
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
            setSession(initialSession);
            // If we don't have a cached user, set the basic one immediately
            if (!user) setUser(initialSession.user);

            // Fetch full profile in background or blocking? 
            // We'll do it blocking for the first time to ensure clinic_id is there, 
            // but we'll add a inner timeout/catch.
            try {
              await fetchUserProfile(initialSession);
              console.log("[Auth] Profile sync complete.");
            } catch (pError) {
              console.warn("[Auth] Background profile fetch failed.", pError);
            }
          } else {
            console.log("[Auth] No initial session found.");
            setSession(null);
            updateUserData(null);
          }
        }
      } catch (e) {
        console.error("[Auth] Fatal error during init:", e);
      } finally {
        if (mounted) {
          clearTimeout(slowLoadId);
          clearTimeout(failSafeId);
          console.log("[Auth] Initialization cycle finished.");
          setLoading(false);
          setSlowLoading(false);
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
          import('@/utils/cacheManager').then(({ cacheManager }) => cacheManager.clearAll());
          return;
        }

        if (newSession) {
          setSession(newSession);
          if (!user) {
            fetchUserProfile(newSession);
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
    slowLoading,
    refreshProfile,
    signIn,
    signOut,
    signUp,
  }), [session, user, loading, slowLoading, refreshProfile, signIn, signOut, signUp]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};