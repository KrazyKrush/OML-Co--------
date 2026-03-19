import React from 'react';
import { Link } from 'react-router-dom';

export default function ProductCard({ product, onDelete, isAuthenticated }) {
  return (
    <div className="product-card">
      <Link to={`/product/${product.id}`} className="product-card__link">
        <div className="product-card__image">
          <img 
            src={product.image || 'https://via.placeholder.com/300x200?text=OML'} 
            alt={product.title} 
          />
          <div className="product-card__category-tag">{product.category}</div>
        </div>
        
        <div className="product-card__content">
          <h3 className="product-card__title">{product.title}</h3>
          
          <p className="product-card__description">
            {product.description.substring(0, 100)}...
          </p>
          
          <div className="product-card__price">
            {product.price.toLocaleString()} ₽
          </div>
          
          <div className="product-card__stock">
            {product.stock > 0 ? `В наличии: ${product.stock} шт.` : 'Нет в наличии'}
          </div>
        </div>
      </Link>
      
      {isAuthenticated && (
        <div className="product-card__actions">
          <Link 
            to={`/product/edit/${product.id}`}
            className="product-card__button product-card__button--edit"
          >
            ✏️ Редактировать
          </Link>
          <button 
            className="product-card__button product-card__button--delete"
            onClick={() => onDelete(product.id)}
          >
            🗑️ Удалить
          </button>
        </div>
      )}
    </div>
  );
}