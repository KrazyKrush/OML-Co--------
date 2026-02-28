import React, { useState, useEffect } from 'react';
import './ProductsPage.scss';

import Header from '../../components/Header';
import ProductList from '../../components/ProductList';
import ProductModal from '../../components/ProductModal';
import { api } from '../../api';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [categories, setCategories] = useState([]);

  // Загрузка товаров при монтировании
  useEffect(() => {
    loadProducts();
  }, []);

  // Обновление списка категорий при изменении товаров
  useEffect(() => {
    const uniqueCategories = [...new Set(products.map(p => p.category))];
    setCategories(uniqueCategories);
  }, [products]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await api.getProducts();
      setProducts(data);
    } catch (error) {
      console.error('Ошибка загрузки товаров:', error);
      alert('Не удалось загрузить товары. Проверьте соединение с сервером.');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setModalMode('create');
    setEditingProduct(null);
    setModalOpen(true);
  };

  const openEditModal = (product) => {
    setModalMode('edit');
    setEditingProduct(product);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingProduct(null);
  };

  const handleDelete = async (id) => {
    const product = products.find(p => p.id === id);
    const confirmDelete = window.confirm(`Удалить товар "${product.name}"?`);
    
    if (!confirmDelete) return;

    try {
      await api.deleteProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error('Ошибка удаления товара:', error);
      alert('Не удалось удалить товар');
    }
  };

  const handleSubmitModal = async (productData) => {
    try {
      if (modalMode === 'create') {
        const newProduct = await api.createProduct(productData);
        setProducts(prev => [...prev, newProduct]);
      } else {
        const updatedProduct = await api.updateProduct(productData.id, productData);
        setProducts(prev => prev.map(p => 
          p.id === productData.id ? updatedProduct : p
        ));
      }
      closeModal();
    } catch (error) {
      console.error('Ошибка сохранения товара:', error);
      alert('Не удалось сохранить товар');
    }
  };

  // Фильтрация товаров по поиску и категории
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="page">
      <Header />

      <main className="main">
        <div className="container">
          <div className="toolbar">
            <h1 className="page-title">Каталог товаров</h1>
            <button 
              className="btn btn--primary btn--large"
              onClick={openCreateModal}
            >
              ➕ Добавить товар
            </button>
          </div>

          <div className="filters">
            <div className="search-box">
              <input
                type="text"
                placeholder="🔍 Поиск товаров..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>

            <div className="category-filter">
              <select 
                value={categoryFilter} 
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="category-select"
              >
                <option value="all">Все категории</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="stats">
            Найдено товаров: <strong>{filteredProducts.length}</strong>
          </div>

          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
              <p>Загрузка товаров...</p>
            </div>
          ) : (
            <ProductList
              products={filteredProducts}
              onEdit={openEditModal}
              onDelete={handleDelete}
            />
          )}
        </div>
      </main>

      <footer className="footer">
        <div className="footer__inner">
          © {new Date().getFullYear()} TechStore. Все права защищены.
        </div>
      </footer>

      <ProductModal
        open={modalOpen}
        mode={modalMode}
        initialProduct={editingProduct}
        onClose={closeModal}
        onSubmit={handleSubmitModal}
      />
    </div>
  );
}