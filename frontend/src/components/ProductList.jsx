import React from 'react';
import ProductCard from './ProductCard';

export default function ProductList({ products, onEdit, onDelete }) {
  if (!products.length) {
    return (
      <div className="empty-state">
        <p>😕 Товары не найдены</p>
        <p className="empty-state__hint">Нажмите "Добавить товар", чтобы создать первый товар</p>
      </div>
    );
  }

  return (
    <div className="product-grid">
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