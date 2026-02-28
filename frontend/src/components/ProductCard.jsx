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
        stars.push(<span key={i} className="star half">⯨</span>);
      } else {
        stars.push(<span key={i} className="star">☆</span>);
      }
    }
    return stars;
  };

  // Определяем класс для статуса наличия
  const stockStatus = product.stock > 10 
    ? 'in-stock' 
    : product.stock > 0 
      ? 'low-stock' 
      : 'out-of-stock';

  const stockText = product.stock > 0 
    ? `В наличии: ${product.stock} шт.` 
    : 'Нет в наличии';

  return (
    <div className="product-card">
      <div className="product-card__image">
        <img src={product.image} alt={product.name} />
      </div>
      
      <div className="product-card__content">
        <div className="product-card__category">{product.category}</div>
        <h3 className="product-card__title">{product.name}</h3>
        
        <div className="product-card__rating">
          {renderRating(product.rating)}
          <span className="product-card__rating-value">{product.rating}</span>
        </div>
        
        <p className="product-card__description">{product.description}</p>
        
        <div className="product-card__price">{product.price.toLocaleString()} ₽</div>
        
        <div className={`product-card__stock ${stockStatus}`}>
          {stockText}
        </div>
        
        <div className="product-card__actions">
          <button 
            className="btn btn--edit"
            onClick={() => onEdit(product)}
          >
            ✏️ Редактировать
          </button>
          <button 
            className="btn btn--delete"
            onClick={() => onDelete(product.id)}
          >
            🗑️ Удалить
          </button>
        </div>
      </div>
    </div>
  );
}