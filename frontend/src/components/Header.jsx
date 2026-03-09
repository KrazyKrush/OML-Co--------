import React from 'react';

export default function Header({ user, onLoginClick, onLogout }) {
  return (
    <header className="header">
      <div className="header__inner">
        <div className="brand">
          <span className="brand__icon">🧙‍♂️</span>
          OML&CO
        </div>
        
        <div className="header__right">
          {user ? (
            <div className="user-menu">
              <span className="user-name">
                {user.first_name} {user.last_name}
              </span>
              <button className="btn-logout" onClick={onLogout}>
                Выйти
              </button>
            </div>
          ) : (
            <button className="btn-login" onClick={onLoginClick}>
              🔐 Войти
            </button>
          )}
        </div>
      </div>
    </header>
  );
}