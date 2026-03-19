import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import RoleBadge from './RoleBadge';

export default function Header({ user }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    navigate('/login');
  };

  return (
    <header className="header">
      <div className="header__inner">
        <Link to="/" className="brand">
          <span className="brand__icon">🧙‍♂️</span>
          OML&CO
        </Link>
        
        <nav className="nav">
          <Link to="/" className="nav-link">Товары</Link>
          {user?.role === 'admin' && (
            <Link to="/users" className="nav-link">Пользователи</Link>
          )}
        </nav>
        
        <div className="header__right">
          {user ? (
            <div className="user-menu">
              <div className="user-info">
                <span className="user-name">
                  {user.first_name} {user.last_name}
                </span>
                <RoleBadge role={user.role} />
              </div>
              <button className="btn-logout" onClick={handleLogout}>
                Выйти
              </button>
            </div>
          ) : (
            <Link to="/login" className="btn-login">
              🔐 Войти
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}