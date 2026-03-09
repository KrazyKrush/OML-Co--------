import React, { useState, useEffect } from 'react';
import './ProductsPage.scss';
import { api } from '../api';
import Header from '../components/Header';
import ProductList from '../components/ProductList';
import ProductModal from '../components/ProductModal';
import AuthModal from '../components/AuthModal';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Проверяем токен при загрузке
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      loadCurrentUser();
    }
    loadProducts();
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

  const loadCurrentUser = async () => {
    try {
      const userData = await api.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Ошибка загрузки пользователя:', error);
      localStorage.removeItem('token');
    }
  };

  const handleLogin = async (credentials) => {
    try {
      const data = await api.login(credentials);
      localStorage.setItem('token', data.accessToken);
      setUser(data.user);
      setAuthModalOpen(false);
      alert('✅ Вход выполнен успешно!');
    } catch (error) {
      alert('❌ Ошибка входа: ' + (error.response?.data?.error || 'Неизвестная ошибка'));
    }
  };

  const handleRegister = async (userData) => {
    try {
      await api.register(userData);
      alert('✅ Регистрация успешна! Теперь войдите.');
      // Переключаем на форму входа
      setAuthModalOpen(true);
    } catch (error) {
      alert('❌ Ошибка регистрации: ' + (error.response?.data?.error || 'Неизвестная ошибка'));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const handleAddProduct = () => {
    if (!user) {
      alert('Сначала войдите в систему');
      setAuthModalOpen(true);
      return;
    }
    setEditingProduct(null);
    setProductModalOpen(true);
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setProductModalOpen(true);
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Удалить этот товар?')) return;
    
    try {
      await api.deleteProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
      alert('✅ Товар удалён');
    } catch (error) {
      alert('❌ Ошибка удаления: ' + (error.response?.data?.error || 'Неизвестная ошибка'));
    }
  };

  const handleSaveProduct = async (productData) => {
    try {
      if (editingProduct) {
        // Обновление
        const updated = await api.updateProduct(editingProduct.id, productData);
        setProducts(prev => prev.map(p => 
          p.id === editingProduct.id ? updated : p
        ));
        alert('✅ Товар обновлён');
      } else {
        // Создание
        const newProduct = await api.createProduct(productData);
        setProducts(prev => [...prev, newProduct]);
        alert('✅ Товар добавлен');
      }
      setProductModalOpen(false);
    } catch (error) {
      alert('❌ Ошибка сохранения: ' + (error.response?.data?.error || 'Неизвестная ошибка'));
    }
  };

  return (
    <div className="page">
      <Header 
        user={user} 
        onLoginClick={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      <main className="main">
        <div className="container">
          <div className="toolbar">
            <h1 className="page-title">🧙‍♂️ Лавка OML&CO</h1>
            {user && (
              <button className="btn btn-primary" onClick={handleAddProduct}>
                ➕ Добавить товар
              </button>
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
              onEdit={handleEditProduct}
              onDelete={handleDeleteProduct}
              isAuthenticated={!!user}
            />
          )}
        </div>
      </main>

      <footer className="footer">
        <div className="footer__inner">
          © {new Date().getFullYear()} OML&CO — магия с улыбкой
        </div>
      </footer>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onLogin={handleLogin}
        onRegister={handleRegister}
      />

      <ProductModal
        isOpen={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        onSubmit={handleSaveProduct}
        product={editingProduct}
      />
    </div>
  );
}