import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Страницы
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProductsPage from './pages/ProductsPage';
import ProductPage from './pages/ProductPage';
import ProductEditPage from './pages/ProductEditPage';
import UsersPage from './pages/UsersPage';

// Компонент для защиты маршрутов по ролям
const ProtectedRoute = ({ children, allowedRoles }) => {
  const accessToken = localStorage.getItem('accessToken');
  const userStr = localStorage.getItem('user');
  
  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles) {
    const user = userStr ? JSON.parse(userStr) : null;
    if (!user || !allowedRoles.includes(user.role)) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<ProductsPage />} />
        <Route path="/product/:id" element={<ProductPage />} />
        
        {/* Только для продавцов и админов */}
        <Route 
          path="/product/new" 
          element={
            <ProtectedRoute allowedRoles={['seller', 'admin']}>
              <ProductEditPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/product/edit/:id" 
          element={
            <ProtectedRoute allowedRoles={['seller', 'admin']}>
              <ProductEditPage />
            </ProtectedRoute>
          } 
        />
        
        {/* Только для админов */}
        <Route 
          path="/users" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <UsersPage />
            </ProtectedRoute>
          } 
        />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;