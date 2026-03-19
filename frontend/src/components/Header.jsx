import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function Header({ user }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    api.logout();
    navigate('/login');
  };

  return (
    <header className="header">
      <div className="header__inner">
        <Link to="/" className="brand">
          <span className="brand__icon">🧙‍♂️</span>
          OML&CO
        </Link>
        
        <div className="header__right">
          {user ? (
            <div className="user-menu">
              <span className="user-name">
                {user.first_name} {user.last_name}
              </span>
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