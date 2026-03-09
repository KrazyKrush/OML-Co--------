import React from 'react';

export default function Header() {
  return (
    <header className="header">
      <div className="header__inner">
        <div className="brand">
          <span className="brand__icon">🧙‍♂️</span>
          OML&CO
        </div>
        <div className="header__right">
          <span>Колдовские вещи с 1666 года</span>
        </div>
      </div>
    </header>
  );
}