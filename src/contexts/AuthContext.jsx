/**
 * Contexto de autenticación
 * 
 * Proporciona el estado de autenticación a toda la aplicación.
 * Sigue el principio de Single Responsibility:
 * - Responsabilidad única: Gestionar estado de autenticación global
 * 
 * @module AuthContext
 */

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { 
  signIn as authSignIn, 
  signUp as authSignUp, 
  signOut as authSignOut,
  getCurrentUser,
  getUserProfile,
  onAuthStateChange
} from '../services/supabase/authService';

/**
 * Contexto de autenticación
 */
const AuthContext = createContext(null);

/**
 * Hook para usar el contexto de autenticación
 * 
 * @returns {Object} Estado y funciones de autenticación
 * @throws {Error} Si se usa fuera de AuthProvider
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}

/**
 * Proveedor de autenticación
 * 
 * @component
 * @param {Object} props - Propiedades del componente
 * @param {React.ReactNode} props.children - Componentes hijos
 * @returns {JSX.Element} Proveedor de contexto
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  /**
   * Carga el usuario y perfil actual
   */
  const loadUser = useCallback(async () => {
    try {
      const { user: currentUser, error: userError } = await getCurrentUser();
      
      if (userError) {
        if (userError?.name !== 'AuthSessionMissingError' && !userError?.message?.includes('Auth session missing')) {
          console.warn('Error al obtener usuario:', userError);
        }
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      setUser(currentUser);

      if (currentUser) {
        const { profile: userProfile, error: profileError } = await getUserProfile(currentUser.id);
        if (profileError) {
          console.warn('Error al obtener perfil:', profileError);
        }
        setProfile(userProfile);
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.error('Error al cargar usuario:', error);
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Inicia sesión
   * @param {string} email
   * @param {string} password
   * @param {Object} [options] - { rememberMe: boolean } para guardar sesión al cerrar la app
   * @returns {Promise<{success: boolean, error: Error|null}>}
   */
  const signIn = useCallback(async (email, password, options) => {
    try {
      const { user: signedInUser, error } = await authSignIn(email, password, options);
      if (error) return { success: false, error };
      if (signedInUser) {
        await loadUser();
        return { success: true, error: null };
      }
      return { success: false, error: new Error('No se pudo iniciar sesión') };
    } catch (error) {
      return { success: false, error };
    }
  }, [loadUser]);

  /**
   * Registra un nuevo usuario
   * @returns {Promise<{success: boolean, error: Error|null}>}
   */
  const signUp = useCallback(async (email, password, username) => {
    try {
      const { user: newUser, error } = await authSignUp(email, password, username);
      if (error) return { success: false, error };
      if (newUser) {
        await loadUser();
        return { success: true, error: null };
      }
      return { success: false, error: new Error('No se pudo registrar el usuario') };
    } catch (error) {
      return { success: false, error };
    }
  }, [loadUser]);

  /**
   * Cierra sesión
   * @returns {Promise<{success: boolean, error: Error|null}>}
   */
  const signOut = useCallback(async () => {
    try {
      const { error } = await authSignOut();
      if (error) return { success: false, error };
      setUser(null);
      setProfile(null);
      return { success: true, error: null };
    } catch (error) {
      return { success: false, error };
    }
  }, []);

  // Cargar usuario al montar el componente
  useEffect(() => {
    loadUser();

    // Escuchar cambios en la autenticación
    const authStateChange = onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await loadUser();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
      }
    });

    // Desuscribirse al desmontar
    return () => {
      if (authStateChange?.data?.subscription) {
        authStateChange.data.subscription.unsubscribe();
      }
    };
  }, []);

  /**
   * Recarga el perfil del usuario actual
   */
  const refreshProfile = useCallback(async () => {
    const currentUser = user;
    if (currentUser) {
      const { profile: userProfile, error: profileError } = await getUserProfile(currentUser.id);
      if (profileError) {
        console.warn('Error al obtener perfil:', profileError);
        return { success: false, error: profileError };
      }
      setProfile(userProfile);
      return { success: true, error: null };
    }
    return { success: false, error: new Error('No hay usuario autenticado') };
  }, [user]);

  const value = useMemo(() => ({
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    refreshProfile,
    isAuthenticated: !!user,
    isApproved: profile?.is_approved || false,
    isAdmin: profile?.role === 'admin'
  }), [user, profile, loading, signIn, signUp, signOut, refreshProfile]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

