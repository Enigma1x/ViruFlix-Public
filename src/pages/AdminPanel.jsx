/**
 * Panel de administración
 *
 * Permite a los administradores aprobar usuarios, cambiar roles
 * y ver estadísticas de la plataforma.
 *
 * @component
 * @returns {JSX.Element} Página del panel de admin
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getAllUsers, manageUserApproval, changeUserRole, getAdminStats } from '../services/supabase/adminService';

function AdminPanel() {
  const { user, isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [filter, setFilter] = useState('all');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [usersResult, statsResult] = await Promise.all([
        getAllUsers(),
        getAdminStats()
      ]);

      if (usersResult.error) {
        setError(usersResult.error.message);
      } else {
        setUsers(usersResult.users || []);
      }

      if (statsResult.error) {
        console.warn('No se pudieron cargar estadísticas:', statsResult.error);
      } else {
        setStats(statsResult.stats);
      }
    } catch (err) {
      setError('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && isAdmin) {
      loadData();
    }
  }, [user, isAdmin, loadData]);

  const handleApproval = async (targetUserId, approved) => {
    setActionLoading(targetUserId);
    try {
      const result = await manageUserApproval(targetUserId, approved);
      if (result.error) {
        setError(result.error.message);
      } else {
        await loadData();
      }
    } catch (err) {
      setError('Error al actualizar usuario');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRoleChange = async (targetUserId, newRole) => {
    setActionLoading(targetUserId);
    try {
      const result = await changeUserRole(targetUserId, newRole);
      if (result.error) {
        setError(result.error.message);
      } else {
        await loadData();
      }
    } catch (err) {
      setError('Error al cambiar rol');
    } finally {
      setActionLoading(null);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0B0C10' }}>
        <p className="text-white text-xl">Debes iniciar sesión</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0B0C10' }}>
        <div className="text-center">
          <p className="text-red-400 text-xl mb-4">Acceso denegado</p>
          <p className="text-gray-400">No tienes permisos de administrador</p>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter(u => {
    if (filter === 'pending') return !u.is_approved;
    if (filter === 'approved') return u.is_approved;
    if (filter === 'admins') return u.role === 'admin';
    return true;
  });

  return (
    <div className="min-h-screen py-12 px-4" style={{ backgroundColor: '#0B0C10' }}>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">Panel de Administración</h1>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-sm mb-6">
            {error}
            <button onClick={() => setError('')} className="ml-4 text-sm underline">Cerrar</button>
          </div>
        )}

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Total Usuarios</p>
              <p className="text-3xl font-bold text-white">{stats.total_users}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Pendientes</p>
              <p className="text-3xl font-bold text-yellow-400">{stats.pending_users}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Aprobados</p>
              <p className="text-3xl font-bold text-green-400">{stats.approved_users}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Admins</p>
              <p className="text-3xl font-bold text-viru-red">{stats.admin_users}</p>
            </div>
          </div>
        )}

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <h2 className="text-2xl font-semibold text-white">Usuarios</h2>
            <div className="flex gap-2">
              {['all', 'pending', 'approved', 'admins'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    filter === f
                      ? 'bg-viru-red text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {f === 'all' ? 'Todos' : f === 'pending' ? 'Pendientes' : f === 'approved' ? 'Aprobados' : 'Admins'}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-viru-red" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No hay usuarios en esta categoría</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-gray-400 text-sm font-medium">Usuario</th>
                    <th className="text-left py-3 px-4 text-gray-400 text-sm font-medium">Email</th>
                    <th className="text-left py-3 px-4 text-gray-400 text-sm font-medium">Estado</th>
                    <th className="text-left py-3 px-4 text-gray-400 text-sm font-medium">Rol</th>
                    <th className="text-left py-3 px-4 text-gray-400 text-sm font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-white font-medium">{u.username}</p>
                          <p className="text-gray-500 text-xs">{u.user_id}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-300 text-sm">{u.email}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          u.is_approved
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                        }`}>
                          {u.is_approved ? 'Aprobado' : 'Pendiente'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          u.role === 'admin'
                            ? 'bg-viru-red/20 text-viru-red border border-viru-red/30'
                            : 'bg-gray-600/20 text-gray-300 border border-gray-600/30'
                        }`}>
                          {u.role === 'admin' ? 'Admin' : 'Usuario'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          {actionLoading === u.id ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-viru-red" />
                          ) : (
                            <>
                              {u.is_approved ? (
                                <button
                                  onClick={() => handleApproval(u.id, false)}
                                  className="px-2 py-1 text-xs bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30 rounded-sm border border-yellow-600/30 transition-colors"
                                  title="Rechazar"
                                >
                                  Rechazar
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleApproval(u.id, true)}
                                  className="px-2 py-1 text-xs bg-green-600/20 text-green-400 hover:bg-green-600/30 rounded-sm border border-green-600/30 transition-colors"
                                  title="Aprobar"
                                >
                                  Aprobar
                                </button>
                              )}
                              {u.role !== 'admin' && (
                                <button
                                  onClick={() => handleRoleChange(u.id, 'admin')}
                                  className="px-2 py-1 text-xs bg-viru-red/20 text-viru-red hover:bg-viru-red/30 rounded-sm border border-viru-red/30 transition-colors"
                                  title="Hacer Admin"
                                >
                                  Hacer Admin
                                </button>
                              )}
                              {u.role === 'admin' && u.id !== user.id && (
                                <button
                                  onClick={() => handleRoleChange(u.id, 'user')}
                                  className="px-2 py-1 text-xs bg-gray-600/20 text-gray-300 hover:bg-gray-600/30 rounded-sm border border-gray-600/30 transition-colors"
                                  title="Quitar Admin"
                                >
                                  Quitar Admin
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminPanel;
