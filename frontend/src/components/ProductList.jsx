import React from 'react';
import ProductCard from './ProductCard';

export default function ProductList({ products, onEdit, onDelete }) {
  if (!products || products.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state__emoji">🧙‍♂️</div>
        <h2>В лавке OML&CO пусто...</h2>
        <p>Все колдовские вещи разобрали!</p>
        <p>Добавьте новый товар с помощью кнопки выше.</p>
      </div>
    );
  }

  return (
    <div className="products-grid">
      {products.map(product => (
        <ProductCard
          key={product.id}
          product={product}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}