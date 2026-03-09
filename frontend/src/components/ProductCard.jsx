import React from 'react';

export default function ProductCard({ product, onEdit, onDelete }) {
  // Функция для отображения рейтинга звездами
  const renderRating = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<span key={i} className="star filled">★</span>);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<span key={i} className="star half">½</span>);
      } else {
        stars.push(<span key={i} className="star">☆</span>);
      }
    }
    return stars;
  };

  // Статус наличия
  const getStockStatus = () => {
    if (product.stock > 20) return { class: 'stock-high', text: '✨ Много' };
    if (product.stock > 5) return { class: 'stock-medium', text: '🔮 Достаточно' };
    if (product.stock > 0) return { class: 'stock-low', text: '⚠️ Мало' };
    return { class: 'stock-out', text: '❌ Нет' };
  };

  const stockStatus = getStockStatus();

  return (
    <div className="product-card">
      <div className="product-card__image">
        <img src={product.image} alt={product.name} />
        <div className="product-card__category-tag">{product.category}</div>
      </div>
      
      <div className="product-card__content">
        <h3 className="product-card__title">{product.name}</h3>
        
        <div className="product-card__rating">
          {renderRating(product.rating)}
          <span className="rating-value">{product.rating}</span>
        </div>
        
        <p className="product-card__description">{product.description}</p>
        
        <div className="product-card__price">
          {product.price.toLocaleString()} ₽
        </div>
        
        <div className={`product-card__stock ${stockStatus.class}`}>
          {stockStatus.text} ({product.stock} шт.)
        </div>
        
        <div className="product-card__actions">
          <button 
            className="product-card__button product-card__button--edit"
            onClick={() => onEdit(product)}
          >
            ✏️ Редактировать
          </button>
          <button 
            className="product-card__button product-card__button--delete"
            onClick={() => onDelete(product.id)}
          >
            🗑️ Удалить
          </button>
        </div>
      </div>
    </div>
  );
}