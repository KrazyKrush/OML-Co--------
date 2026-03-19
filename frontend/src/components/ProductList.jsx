import React from 'react';
import ProductCard from './ProductCard';

export default function ProductList({ products, onDelete, userRole }) {
  if (!products || products.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state__emoji">🧙‍♂️</div>
        <h2>В лавке OML&CO пусто...</h2>
        <p>Все колдовские вещи разобрали!</p>
        {userRole === 'seller' || userRole === 'admin' ? (
          <p>Добавьте новый товар с помощью кнопки "Добавить товар"</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="products-grid">
      {products.map(product => (
        <ProductCard
          key={product.id}
          product={product}
          onDelete={onDelete}
          userRole={userRole}
        />
      ))}
    </div>
  );
}