import React from 'react';

export default function Header() {
  return (
    <header className="header">
      <div className="header__inner">
        <div className="brand">🛒 TechStore</div>
        <div className="header__right">
          <span>Интернет-магазин электроники</span>
        </div>
      </div>
    </header>
  );
}