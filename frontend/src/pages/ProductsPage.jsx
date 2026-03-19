import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import ProductList from '../components/ProductList';
import Header from '../components/Header';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadProducts();
    loadUser();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await api.getProducts();
      setProducts(data);
    } catch (error) {
      console.error('Ошибка загрузки товаров:', error);
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

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить этот товар?')) return;
    
    try {
      await api.deleteProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      alert('Ошибка удаления: ' + (error.response?.data?.error || 'Неизвестная ошибка'));
    }
  };

  return (
    <div className="page">
      <Header user={user} />

      <main className="main">
        <div className="container">
          <div className="toolbar">
            <h1 className="page-title">🧙‍♂️ Лавка OML&CO</h1>
            {user && (
              <Link to="/product/new" className="btn btn-primary">
                ➕ Добавить товар
              </Link>
            )}
          </div>

          {loading ? (
            <div className="loading">
              <div className="spinner">🧙</div>
              <p>OML&CO колдует над загрузкой...</p>
            </div>
          ) : (
            <ProductList
              products={products}
              onDelete={handleDelete}
              isAuthenticated={!!user}
            />
          )}
        </div>
      </main>
    </div>
  );
}