import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔐 Initial session:', session);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('🔐 Auth state change:', _event, session);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    console.log('🔐 SignUp attempt:', { email, passwordLength: password.length });
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: undefined,
        data: {}
      }
    });
    console.log('🔐 SignUp result:', { 
      user: data.user?.id ? 'Created' : 'Failed',
      session: data.session ? 'Active' : 'None',
      error: error?.message || 'None'
    });
    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    console.log('🔐 SignIn attempt:', { email, passwordLength: password.length });
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    console.log('🔐 SignIn result:', { 
      user: data.user?.id ? 'Authenticated' : 'Failed',
      session: data.session ? 'Active' : 'None',
      error: error?.message || 'None'
    });
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  return {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  };
}