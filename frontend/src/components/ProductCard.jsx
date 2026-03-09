import React from 'react';

export default function ProductCard({ product, onEdit, onDelete, isAuthenticated }) {
  // Функция для отображения рейтинга звёздами
  const renderRating = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating || 0);
    
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<span key={i} className="star filled">★</span>);
      } else {
        stars.push(<span key={i} className="star">☆</span>);
      }
    }
    return stars;
  };

  return (
    <div className="product-card">
      <div className="product-card__image">
        <img 
          src={product.image || 'https://via.placeholder.com/300x200?text=OML'} 
          alt={product.title} 
        />
        <div className="product-card__category-tag">{product.category}</div>
      </div>
      
      <div className="product-card__content">
        <h3 className="product-card__title">{product.title}</h3>
        
        <div className="product-card__rating">
          {renderRating(product.rating)}
          <span className="rating-value">{product.rating || 0}</span>
        </div>
        
        <p className="product-card__description">{product.description}</p>
        
        <div className="product-card__price">
          {product.price.toLocaleString()} ₽
        </div>
        
        <div className="product-card__stock">
          {product.stock > 0 ? `В наличии: ${product.stock} шт.` : 'Нет в наличии'}
        </div>
        
        {isAuthenticated && (
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
        )}
      </div>
    </div>
  );
}