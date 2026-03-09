import React, { useState, useEffect } from 'react';
import './ProductsPage.scss';
import { api } from '../api';
import Header from '../components/Header';
import ProductList from '../components/ProductList';
import ProductModal from '../components/ProductModal';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [categories, setCategories] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Загрузка товаров
  useEffect(() => {
    loadProducts();
  }, []);

  // Обновление списка категорий
  useEffect(() => {
    const unique = [...new Set(products.map(p => p.category))];
    setCategories(unique);
  }, [products]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await api.getProducts();
      setProducts(data);
    } catch (error) {
      console.error('Ошибка загрузки:', error);
      alert('Не удалось загрузить товары. Запущен ли сервер?');
    } finally {
      setLoading(false);
    }
  };

  const handleAddClick = () => {
    setEditingProduct(null);
    setModalOpen(true);
  };

  const handleEditClick = (product) => {
    setEditingProduct(product);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingProduct(null);
  };

  const handleSaveProduct = async (productData) => {
    try {
      if (editingProduct) {
        const updated = await api.updateProduct(editingProduct.id, productData);
        setProducts(prev => prev.map(p => 
          p.id === editingProduct.id ? updated : p
        ));
        alert('✅ Товар обновлён!');
      } else {
        const newProduct = await api.createProduct(productData);
        setProducts(prev => [...prev, newProduct]);
        alert('✅ Товар добавлен!');
      }
      handleCloseModal();
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      alert('❌ Не удалось сохранить товар');
    }
  };

  const handleDeleteProduct = async (id) => {
    const product = products.find(p => p.id === id);
    if (!window.confirm(`Удалить "${product.name}"?`)) return;

    try {
      await api.deleteProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
      alert('✅ Товар удалён');
    } catch (error) {
      console.error('Ошибка удаления:', error);
      alert('❌ Не удалось удалить товар');
    }
  };

  // Фильтрация товаров
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                         p.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="page">
      <Header />

      <main className="main">
        <div className="container">
          <div className="toolbar">
            <h1 className="page-title">🧙‍♂️ Лавка OML&CO</h1>
            <button className="btn btn-primary" onClick={handleAddClick}>
              ➕ Добавить товар
            </button>
          </div>

          <div className="filters">
            <input
              type="text"
              placeholder="🔮 Поиск среди колдовских вещей..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="search-input"
            />

            <select 
              value={categoryFilter} 
              onChange={e => setCategoryFilter(e.target.value)}
              className="category-select"
            >
              <option value="all">Все категории</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="stats">
            Найдено чудес: {filteredProducts.length}
          </div>

          {loading ? (
            <div className="loading">
              <div className="spinner">🧙</div>
              <p>OML&CO колдует над загрузкой...</p>
            </div>
          ) : (
            <ProductList
              products={filteredProducts}
              onEdit={handleEditClick}
              onDelete={handleDeleteProduct}
            />
          )}
        </div>
      </main>

      <footer className="footer">
        <div className="footer__inner">
          © {new Date().getFullYear()} OML&CO — магия с улыбкой
        </div>
      </footer>

      <ProductModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSaveProduct}
        product={editingProduct}
      />
    </div>
  );
}