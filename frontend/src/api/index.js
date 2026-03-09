import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const api = {
  // Получить все товары
  getProducts: async () => {
    try {
      const response = await apiClient.get('/products');
      return response.data;
    } catch (error) {
      console.error('Ошибка получения товаров:', error);
      throw error;
    }
  },

  // Получить товар по ID
  getProductById: async (id) => {
    try {
      const response = await apiClient.get(`/products/${id}`);
      return response.data;
    } catch (error) {
      console.error('Ошибка получения товара:', error);
      throw error;
    }
  },

  // Создать новый товар
  createProduct: async (product) => {
    try {
      const response = await apiClient.post('/products', product);
      return response.data;
    } catch (error) {
      console.error('Ошибка создания товара:', error);
      throw error;
    }
  },

  // Обновить товар
  updateProduct: async (id, product) => {
    try {
      const response = await apiClient.patch(`/products/${id}`, product);
      return response.data;
    } catch (error) {
      console.error('Ошибка обновления товара:', error);
      throw error;
    }
  },

  // Удалить товар
  deleteProduct: async (id) => {
    try {
      const response = await apiClient.delete(`/products/${id}`);
      return response.data;
    } catch (error) {
      console.error('Ошибка удаления товара:', error);
      throw error;
    }
  }
};