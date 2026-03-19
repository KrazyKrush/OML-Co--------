import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import Header from '../components/Header';

export default function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadProduct();
    loadUser();
  }, [id]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const data = await api.getProductById(id);
      setProduct(data);
    } catch (error) {
      console.error('Ошибка загрузки товара:', error);
      if (error.response?.status === 404) {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadUser = async () => {
    try {
      if (localStorage.getItem('accessToken')) {
        const userData = await api.getCurrentUser();
        setUser(userData);
      }
    } catch (error) {
      console.error('Ошибка загрузки пользователя:', error);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Удалить этот товар?')) return;
    
    try {
      await api.deleteProduct(id);
      navigate('/');
    } catch (error) {
      alert('Ошибка удаления: ' + (error.response?.data?.error || 'Неизвестная ошибка'));
    }
  };

  if (loading) {
    return (
      <div className="page">
        <Header user={user} />
        <div className="loading">Загрузка...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="page">
        <Header user={user} />
        <div className="not-found">Товар не найден</div>
      </div>
    );
  }

  return (
    <div className="page">
      <Header user={user} />

      <main className="main">
        <div className="container">
          <div className="product-detail">
            <div className="product-detail__image">
              <img src={product.image} alt={product.title} />
            </div>
            
            <div className="product-detail__info">
              <h1>{product.title}</h1>
              <div className="product-detail__category">{product.category}</div>
              <div className="product-detail__price">{product.price.toLocaleString()} ₽</div>
              <div className="product-detail__stock">
                {product.stock > 0 ? `В наличии: ${product.stock} шт.` : 'Нет в наличии'}
              </div>
              <div className="product-detail__rating">
                Рейтинг: {product.rating || 0} / 5
              </div>
              <p className="product-detail__description">{product.description}</p>
              
              {user && (
                <div className="product-detail__actions">
                  <Link to={`/product/edit/${product.id}`} className="btn btn-primary">
                    ✏️ Редактировать
                  </Link>
                  <button className="btn btn-danger" onClick={handleDelete}>
                    🗑️ Удалить
                  </button>
                </div>
              )}
              
              <Link to="/" className="btn btn-secondary">
                ← Назад к списку
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}