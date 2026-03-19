import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import Header from '../components/Header';
import RoleBadge from '../components/RoleBadge';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const userData = await api.getCurrentUser();
      setUser(userData);
      
      // Если пользователь не админ - редирект
      if (userData.role !== 'admin') {
        navigate('/');
        return;
      }
      
      // Загружаем список пользователей
      loadUsers();
    } catch (error) {
      console.error('Ошибка загрузки пользователя:', error);
      navigate('/login');
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await api.getUsers();
      setUsers(data);
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error);
      if (error.response?.status === 403) {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.updateUser(userId, { role: newRole });
      alert('✅ Роль изменена');
      loadUsers();
    } catch (error) {
      alert('❌ Ошибка: ' + (error.response?.data?.error || 'Неизвестная ошибка'));
    }
  };

  const handleToggleActive = async (userId, currentStatus) => {
    try {
      await api.updateUser(userId, { isActive: !currentStatus });
      alert(`✅ Пользователь ${!currentStatus ? 'активирован' : 'заблокирован'}`);
      loadUsers();
    } catch (error) {
      alert('❌ Ошибка: ' + (error.response?.data?.error || 'Неизвестная ошибка'));
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Вы уверены, что хотите удалить этого пользователя?')) return;
    
    try {
      await api.deleteUser(userId);
      alert('✅ Пользователь удалён');
      loadUsers();
    } catch (error) {
      alert('❌ Ошибка: ' + (error.response?.data?.error || 'Неизвестная ошибка'));
    }
  };

  if (loading) {
    return (
      <div className="page">
        <Header user={user} />
        <div className="loading">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="page">
      <Header user={user} />

      <main className="main">
        <div className="container">
          <div className="toolbar">
            <h1 className="page-title">👥 Управление пользователями</h1>
          </div>

          {users.length === 0 ? (
            <div className="empty-state">
              <p>Пользователей пока нет</p>
            </div>
          ) : (
            <div className="users-table">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Имя</th>
                    <th>Email</th>
                    <th>Роль</th>
                    <th>Статус</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className={!u.isActive ? 'inactive' : ''}>
                      <td>{u.id.substring(0, 8)}...</td>
                      <td>{u.first_name} {u.last_name}</td>
                      <td>{u.email}</td>
                      <td>
                        <RoleBadge role={u.role} />
                      </td>
                      <td>
                        <span className={`status-badge ${u.isActive ? 'active' : 'inactive'}`}>
                          {u.isActive ? 'Активен' : 'Заблокирован'}
                        </span>
                      </td>
                      <td>
                        <div className="user-actions">
                          <select 
                            value={u.role} 
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            disabled={u.id === user?.id}
                          >
                            <option value="user">Пользователь</option>
                            <option value="seller">Продавец</option>
                            <option value="admin">Админ</option>
                          </select>
                          
                          <button 
                            onClick={() => handleToggleActive(u.id, u.isActive)}
                            disabled={u.id === user?.id}
                            className="btn-toggle"
                          >
                            {u.isActive ? 'Заблокировать' : 'Разблокировать'}
                          </button>
                          
                          <button 
                            onClick={() => handleDeleteUser(u.id)}
                            disabled={u.id === user?.id}
                            className="btn-delete"
                          >
                            Удалить
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}