import React, { useEffect, useState } from 'react';

export default function ProductModal({ open, mode, initialProduct, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    price: '',
    stock: '',
    rating: '',
    image: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    
    if (initialProduct) {
      setFormData({
        name: initialProduct.name || '',
        category: initialProduct.category || '',
        description: initialProduct.description || '',
        price: initialProduct.price?.toString() || '',
        stock: initialProduct.stock?.toString() || '',
        rating: initialProduct.rating?.toString() || '',
        image: initialProduct.image || ''
      });
    } else {
      // Сброс формы для создания
      setFormData({
        name: '',
        category: '',
        description: '',
        price: '',
        stock: '',
        rating: '',
        image: ''
      });
    }
    setErrors({});
  }, [open, initialProduct]);

  if (!open) return null;

  const title = mode === 'edit' ? 'Редактировать товар' : 'Добавить новый товар';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Очищаем ошибку для этого поля
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = 'Введите название товара';
    if (!formData.category.trim()) newErrors.category = 'Введите категорию';
    if (!formData.description.trim()) newErrors.description = 'Введите описание';
    
    const price = Number(formData.price);
    if (!formData.price) newErrors.price = 'Введите цену';
    else if (isNaN(price) || price <= 0) newErrors.price = 'Цена должна быть положительным числом';
    
    const stock = Number(formData.stock);
    if (!formData.stock && formData.stock !== '0') newErrors.stock = 'Введите количество на складе';
    else if (isNaN(stock) || stock < 0) newErrors.stock = 'Количество должно быть неотрицательным числом';

    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({
      id: initialProduct?.id,
      name: formData.name.trim(),
      category: formData.category.trim(),
      description: formData.description.trim(),
      price: Number(formData.price),
      stock: Number(formData.stock),
      rating: formData.rating ? Number(formData.rating) : 0,
      image: formData.image || `https://via.placeholder.com/300x200?text=${encodeURIComponent(formData.name)}`
    });
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={handleBackdropClick}>
      <div className="modal">
        <div className="modal__header">
          <h2 className="modal__title">{title}</h2>
          <button className="modal__close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal__form">
          <div className="form-group">
            <label htmlFor="name">Название товара *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Например: Ноутбук ASUS ROG"
              className={errors.name ? 'error' : ''}
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="category">Категория *</label>
            <input
              type="text"
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              placeholder="Например: Ноутбуки"
              className={errors.category ? 'error' : ''}
            />
            {errors.category && <span className="error-message">{errors.category}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="description">Описание *</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Подробное описание товара..."
              rows="3"
              className={errors.description ? 'error' : ''}
            />
            {errors.description && <span className="error-message">{errors.description}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="price">Цена (₽) *</label>
              <input
                type="number"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleChange}
                placeholder="49990"
                min="0"
                step="1"
                className={errors.price ? 'error' : ''}
              />
              {errors.price && <span className="error-message">{errors.price}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="stock">Количество на складе *</label>
              <input
                type="number"
                id="stock"
                name="stock"
                value={formData.stock}
                onChange={handleChange}
                placeholder="10"
                min="0"
                step="1"
                className={errors.stock ? 'error' : ''}
              />
              {errors.stock && <span className="error-message">{errors.stock}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="rating">Рейтинг (0-5)</label>
            <input
              type="number"
              id="rating"
              name="rating"
              value={formData.rating}
              onChange={handleChange}
              placeholder="4.5"
              min="0"
              max="5"
              step="0.1"
            />
          </div>

          <div className="form-group">
            <label htmlFor="image">URL изображения (необязательно)</label>
            <input
              type="url"
              id="image"
              name="image"
              value={formData.image}
              onChange={handleChange}
              placeholder="https://example.com/image.jpg"
            />
            <small>Если не указано, будет использовано изображение по умолчанию</small>
          </div>

          <div className="modal__footer">
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Отмена
            </button>
            <button type="submit" className="btn btn--primary">
              {mode === 'edit' ? 'Сохранить изменения' : 'Создать товар'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}