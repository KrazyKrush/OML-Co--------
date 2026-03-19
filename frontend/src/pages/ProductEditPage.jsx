import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import Header from '../components/Header';
import ProductForm from '../components/ProductForm';

export default function ProductEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(!!id);
  const [user, setUser] = useState(null);

  const isEditing = !!id;

  useEffect(() => {
    loadUser();
    if (isEditing) {
      loadProduct();
    }
  }, [id]);

  const loadUser = async () => {
    try {
      const userData = await api.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Ошибка загрузки пользователя:', error);
      navigate('/login');
    }
  };

  const loadProduct = async () => {
    try {
      setLoading(true);
      const data = await api.getProductById(id);
      setProduct(data);
    } catch (error) {
      console.error('Ошибка загрузки товара:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (productData) => {
    try {
      if (isEditing) {
        await api.updateProduct(id, productData);
        alert('✅ Товар обновлён!');
      } else {
        await api.createProduct(productData);
        alert('✅ Товар создан!');
      }
      navigate('/');
    } catch (error) {
      alert('❌ Ошибка: ' + (error.response?.data?.error || 'Неизвестная ошибка'));
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

  return (
    <div className="page">
      <Header user={user} />

      <main className="main">
        <div className="container">
          <div className="form-container">
            <h1>{isEditing ? '✏️ Редактировать товар' : '✨ Создать новый товар'}</h1>
            
            <ProductForm
              initialData={product || {}}
              onSubmit={handleSubmit}
              onCancel={() => navigate('/')}
            />
          </div>
        </div>
      </main>
    </div>
  );
}