/**
 * Página de perfil de usuario
 * 
 * Muestra y permite editar el perfil del usuario.
 * 
 * @component
 * @returns {JSX.Element} Página de perfil
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { updateUserProfile, createProfileIfMissing, updatePassword } from '../services/supabase/authService';

function Profile() {
  const navigate = useNavigate();
  const { user, profile, signOut, isApproved, isAdmin, refreshProfile } = useAuth();
  const [username, setUsername] = useState('');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [nsfwLoading, setNsfwLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const isEditingRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const hasRefreshedOnceRef = useRef(false);
  const creatingProfileRef = useRef(false);

  // Recargar perfil cuando se monta el componente para asegurar datos actualizados
  useEffect(() => {
    const loadProfile = async () => {
      if (user) {
        setRefreshing(true);
        await refreshProfile();
        hasRefreshedOnceRef.current = true;
        setRefreshing(false);
      }
    };
    loadProfile();
  }, [user, refreshProfile]);

  // Si hay usuario pero no perfil (p. ej. usuario antiguo), crear perfil con ID único
  useEffect(() => {
    if (!user || profile || !hasRefreshedOnceRef.current || creatingProfileRef.current) return;

    const createAndRefresh = async () => {
      creatingProfileRef.current = true;
      const defaultName = user.user_metadata?.username || user.email?.split('@')[0] || 'Usuario';
      const { profile: created, error } = await createProfileIfMissing(user.id, defaultName);
      if (error) {
        console.error('Error al crear perfil automáticamente:', error);
      }
      if (created) {
        await refreshProfile();
      }
      creatingProfileRef.current = false;
    };

    createAndRefresh();
  }, [user, profile, refreshProfile]);

  // Solo actualizar userId desde el perfil la primera vez o si el usuario no está editando
  useEffect(() => {
    if (profile) {
      // Solo actualizar si es la primera vez o si el usuario no está editando
      if (!hasInitializedRef.current || !isEditingRef.current) {
        setUsername(profile.username || '');
        setUserId(profile.user_id || '');
        hasInitializedRef.current = true;
        // Log de depuración para ver el estado del perfil
        console.log('✅ Perfil cargado en Profile.jsx:', {
          user_id: profile.user_id,
          is_approved: profile.is_approved,
          role: profile.role,
          profile_completo: profile
        });
      }
    }
  }, [profile, user]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Validar que el user_id tenga el formato correcto si se proporciona
      if (userId && !userId.match(/^[a-z0-9_]+$/)) {
        setMessage({ 
          type: 'error', 
          text: 'El ID de usuario solo puede contener letras minúsculas, números y guiones bajos' 
        });
        setLoading(false);
        return;
      }

      // Validar longitud mínima del user_id
      if (userId && userId.length < 3) {
        setMessage({ 
          type: 'error', 
          text: 'El ID de usuario debe tener al menos 3 caracteres' 
        });
        setLoading(false);
        return;
      }

      if (!username || username.trim().length < 3) {
        setMessage({ type: 'error', text: 'El nombre para mostrar debe tener al menos 3 caracteres' });
        setLoading(false);
        return;
      }
      if (!userId || userId.trim() === '') {
        setMessage({ type: 'error', text: 'El ID de usuario es obligatorio' });
        setLoading(false);
        return;
      }

      const updates = {};
      if (username.trim() !== (profile?.username ?? '')) updates.username = username.trim();
      if (userId.trim() !== (profile?.user_id ?? '')) updates.user_id = userId.trim();

      if (Object.keys(updates).length === 0) {
        setMessage({ type: 'error', text: 'No hay cambios para guardar' });
        setLoading(false);
        return;
      }

      const { error } = await updateUserProfile(user.id, updates);
      
      if (error) {
        setMessage({ type: 'error', text: error.message });
        isEditingRef.current = false; // Permitir actualización si hay error
      } else {
        setMessage({ type: 'success', text: 'Perfil actualizado correctamente' });
        // Resetear el flag de edición antes de recargar
        isEditingRef.current = false;
        // Recargar el perfil para ver los cambios
        await refreshProfile();
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error al actualizar el perfil' });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordMessage({ type: '', text: '' });

    if (!currentPassword) {
      setPasswordMessage({ type: 'error', text: 'Ingresa tu contraseña actual' });
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'La nueva contraseña debe tener al menos 6 caracteres' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Las contraseñas no coinciden' });
      return;
    }

    setPasswordLoading(true);
    try {
      const { error: updateError } = await updatePassword(newPassword);
      if (updateError) {
        setPasswordMessage({ type: 'error', text: updateError.message });
      } else {
        setPasswordMessage({ type: 'success', text: 'Contraseña actualizada correctamente' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      setPasswordMessage({ type: 'error', text: 'Error al cambiar contraseña' });
    } finally {
      setPasswordLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0B0C10' }}>
        <div className="text-center">
          <p className="text-white text-xl mb-4">Debes iniciar sesión para ver tu perfil</p>
          <button
            onClick={() => {
              // El modal se manejará desde Layout, pero redirigimos a home para que Layout esté disponible
              navigate('/');
              // Abrir modal después de un pequeño delay para asegurar que Layout esté montado
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('openLoginModal'));
              }, 100);
            }}
            className="px-6 py-3 bg-viru-red hover:bg-viru-red/90 text-white font-semibold rounded-lg transition-colors"
          >
            Iniciar Sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4" style={{ backgroundColor: '#0B0C10' }}>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">Mi Perfil</h1>

        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold text-white mb-4">Información de la cuenta</h2>
          
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
              <p className="text-white">{user.email}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Nombre para mostrar</label>
              <p className="text-white">{profile?.username || 'No asignado'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">ID de usuario</label>
              <p className="text-white text-sm font-mono">{profile?.user_id || 'No asignado'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Estado</label>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  isApproved
                    ? 'bg-green-500/20 text-green-400 border border-green-500'
                    : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500'
                }`}>
                  {isApproved ? 'Aprobado' : 'Pendiente de aprobación'}
                </span>
                {isAdmin && (
                  <span className="px-3 py-1 rounded-full text-sm font-semibold bg-viru-red/20 text-viru-red border border-viru-red">
                    Administrador
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between py-3 border-t border-gray-700">
              <div>
                <p className="text-sm font-medium text-gray-300">Contenido para adultos (+18)</p>
                <p className="text-xs text-gray-500">Muestra canales +18 en TV en vivo</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={profile?.show_adult_content ?? false}
                disabled={nsfwLoading}
                onClick={async () => {
                  setNsfwLoading(true);
                  const newValue = !(profile?.show_adult_content ?? false);
                  const { error } = await updateUserProfile(user.id, { show_adult_content: newValue });
                  if (!error) {
                    await refreshProfile();
                  }
                  setNsfwLoading(false);
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-viru-red disabled:opacity-50 ${
                  (profile?.show_adult_content ?? false) ? 'bg-viru-red' : 'bg-white/10'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    (profile?.show_adult_content ?? false) ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {profile?.created_at && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Miembro desde</label>
                <p className="text-white">
                  {new Date(profile.created_at).toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold text-white mb-4">Editar perfil</h2>
          
          <form onSubmit={handleUpdate} className="space-y-4">
            {message.text && (
              <div className={`px-4 py-3 rounded ${
                message.type === 'success' 
                  ? 'bg-green-500/20 border border-green-500 text-green-200' 
                  : 'bg-red-500/20 border border-red-500 text-red-200'
              }`}>
                {message.text}
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                Nombre para mostrar
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => {
                  isEditingRef.current = true;
                  setUsername(e.target.value);
                }}
                onBlur={() => setTimeout(() => { isEditingRef.current = false; }, 200)}
                required
                minLength={3}
                maxLength={40}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-hidden focus:border-viru-red focus:ring-1 focus:ring-viru-red"
                placeholder="Tu nombre"
              />
            </div>
            <div>
              <label htmlFor="userId" className="block text-sm font-medium text-gray-300 mb-2">
                ID de usuario
              </label>
              <input
                id="userId"
                type="text"
                value={userId}
                onChange={(e) => {
                  isEditingRef.current = true;
                  setUserId(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                }}
                onBlur={() => setTimeout(() => { isEditingRef.current = false; }, 200)}
                required
                minLength={3}
                maxLength={20}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-hidden focus:border-viru-red focus:ring-1 focus:ring-viru-red"
                placeholder="mi_id_usuario"
              />
              <p className="text-gray-400 text-xs mt-1">
                Solo letras minúsculas, números y guiones bajos. Debe ser único.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-viru-red hover:bg-viru-red/90 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </form>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold text-white mb-4">Configuración</h2>

          <div className="space-y-4">
            <div className="pt-3 border-t border-gray-700">
              <p className="text-sm text-gray-400 mb-3">Cambiar contraseña</p>
              {passwordMessage.text && (
                <div className={`px-4 py-3 rounded mb-3 ${
                  passwordMessage.type === 'success'
                    ? 'bg-green-500/20 border border-green-500 text-green-200'
                    : 'bg-red-500/20 border border-red-500 text-red-200'
                }`}>
                  {passwordMessage.text}
                </div>
              )}
              <form onSubmit={handlePasswordChange} className="space-y-3">
                <input
                  type="password"
                  id="current-password"
                  placeholder="Contraseña actual"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-hidden focus:border-viru-red focus:ring-1 focus:ring-viru-red"
                />
                <input
                  type="password"
                  id="new-password"
                  placeholder="Nueva contraseña"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-hidden focus:border-viru-red focus:ring-1 focus:ring-viru-red"
                />
                <input
                  type="password"
                  id="confirm-password"
                  placeholder="Confirmar nueva contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-hidden focus:border-viru-red focus:ring-1 focus:ring-viru-red"
                />
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  {passwordLoading ? 'Cambiando...' : 'Cambiar Contraseña'}
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-white mb-4">Acciones</h2>

          <button
            onClick={handleSignOut}
            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  );
}

export default Profile;

