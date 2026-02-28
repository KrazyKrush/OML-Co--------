const express = require('express');
const cors = require('cors');
const { nanoid } = require('nanoid');
const initialProducts = require('./data');

// Подключаем Swagger
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();
const port = 3000;

let products = [...initialProducts];

// Middleware
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:3001',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));

// Логирование
app.use((req, res, next) => {
  res.on('finish', () => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${res.statusCode} ${req.path}`);
  });
  next();
});

// ========== НАСТРОЙКА SWAGGER ==========
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'OML&CO API - Лавка колдовских вещей',
      version: '1.0.0',
      description: 'API для управления товарами в магической лавке OML&CO',
    },
    servers: [
      {
        url: `http://localhost:${port}`,
        description: 'Локальный сервер OML&CO',
      },
    ],
  },
  // Путь к файлам с JSDoc-комментариями (текущий файл)
  apis: ['./app.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Подключаем Swagger UI по адресу /api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
// ========== КОНЕЦ НАСТРОЙКИ SWAGGER ==========

// Функция для поиска товара
const findProduct = (id, res) => {
  const product = products.find(p => p.id === id);
  if (!product) {
    res.status(404).json({ error: 'Товар OML&CO не найден' });
    return null;
  }
  return product;
};

/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       required:
 *         - name
 *         - category
 *         - description
 *         - price
 *         - stock
 *       properties:
 *         id:
 *           type: string
 *           description: Уникальный ID товара (генерируется автоматически)
 *           example: "abc123"
 *         name:
 *           type: string
 *           description: Название товара
 *           example: "Зелье от похмелья"
 *         category:
 *           type: string
 *           description: Категория товара
 *           example: "Зелья OML"
 *         description:
 *           type: string
 *           description: Описание товара
 *           example: "Фирменное зелье OML&CO. Выпей перед сном после бурной пятницы..."
 *         price:
 *           type: number
 *           description: Цена в рублях
 *           example: 299
 *         stock:
 *           type: integer
 *           description: Количество на складе
 *           example: 42
 *         rating:
 *           type: number
 *           description: Рейтинг товара (0-5)
 *           example: 4.7
 *         image:
 *           type: string
 *           description: URL изображения товара
 *           example: "/images/zelye.jpg"
 */

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Управление товарами OML&CO
 */

// ============= МАРШРУТЫ API =============

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Получить все товары
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Список всех товаров
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 */
app.get('/api/products', (req, res) => {
  res.json(products);
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Получить товар по ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID товара
 *         example: "1"
 *     responses:
 *       200:
 *         description: Данные товара
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Товар не найден
 */
app.get('/api/products/:id', (req, res) => {
  const product = findProduct(req.params.id, res);
  if (product) res.json(product);
});

/**
 * @swagger
 * /api/products/category/{category}:
 *   get:
 *     summary: Получить товары по категории
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: category
 *         schema:
 *           type: string
 *         required: true
 *         description: Название категории
 *         example: "Зелья OML"
 *     responses:
 *       200:
 *         description: Список товаров в категории
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 */
app.get('/api/products/category/:category', (req, res) => {
  const filtered = products.filter(p => 
    p.category.toLowerCase().includes(req.params.category.toLowerCase())
  );
  res.json(filtered);
});

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Создать новый товар
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - category
 *               - description
 *               - price
 *               - stock
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Зелье удачи"
 *               category:
 *                 type: string
 *                 example: "Зелья OML"
 *               description:
 *                 type: string
 *                 example: "Приносит удачу, но отнимает носки"
 *               price:
 *                 type: number
 *                 example: 399
 *               stock:
 *                 type: integer
 *                 example: 50
 *               rating:
 *                 type: number
 *                 example: 4.5
 *               image:
 *                 type: string
 *                 example: "/images/udacha.jpg"
 *     responses:
 *       201:
 *         description: Товар успешно создан
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Ошибка валидации
 */
app.post('/api/products', (req, res) => {
  const { name, category, description, price, stock, rating, image } = req.body;

  if (!name || !category || !description || !price || stock === undefined) {
    return res.status(400).json({ error: 'Заполните все поля для товара OML&CO' });
  }

  if (typeof price !== 'number' || price <= 0) {
    return res.status(400).json({ error: 'Цена должна быть положительным числом' });
  }

  if (typeof stock !== 'number' || stock < 0) {
    return res.status(400).json({ error: 'Количество должно быть >= 0' });
  }

  const newProduct = {
    id: nanoid(8),
    name: name.trim(),
    category: category.trim().includes('OML') ? category.trim() : `${category.trim()} OML`,
    description: description.trim(),
    price,
    stock,
    rating: rating || 0,
    image: image || `https://via.placeholder.com/300x200?text=OML+${encodeURIComponent(name)}`
  };

  products.push(newProduct);
  res.status(201).json(newProduct);
});

/**
 * @swagger
 * /api/products/{id}:
 *   patch:
 *     summary: Обновить товар
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID товара
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Новое название"
 *               category:
 *                 type: string
 *                 example: "Новая категория OML"
 *               description:
 *                 type: string
 *                 example: "Новое описание"
 *               price:
 *                 type: number
 *                 example: 999
 *               stock:
 *                 type: integer
 *                 example: 10
 *               rating:
 *                 type: number
 *                 example: 4.8
 *               image:
 *                 type: string
 *                 example: "/images/new.jpg"
 *     responses:
 *       200:
 *         description: Обновленный товар
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Товар не найден
 *       400:
 *         description: Нет данных для обновления
 */
app.patch('/api/products/:id', (req, res) => {
  const product = findProduct(req.params.id, res);
  if (!product) return;

  const { name, category, description, price, stock, rating, image } = req.body;

  if (Object.keys(req.body).length === 0) {
    return res.status(400).json({ error: 'Нет данных для обновления' });
  }

  if (name !== undefined) product.name = name.trim();
  if (category !== undefined) product.category = category.trim();
  if (description !== undefined) product.description = description.trim();
  
  if (price !== undefined) {
    if (typeof price !== 'number' || price <= 0) {
      return res.status(400).json({ error: 'Цена должна быть положительным числом' });
    }
    product.price = price;
  }

  if (stock !== undefined) {
    if (typeof stock !== 'number' || stock < 0) {
      return res.status(400).json({ error: 'Количество должно быть >= 0' });
    }
    product.stock = stock;
  }

  if (rating !== undefined) product.rating = rating;
  if (image !== undefined) product.image = image;

  res.json(product);
});

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Удалить товар
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID товара
 *     responses:
 *       204:
 *         description: Товар успешно удален (нет тела ответа)
 *       404:
 *         description: Товар не найден
 */
app.delete('/api/products/:id', (req, res) => {
  const exists = products.some(p => p.id === req.params.id);
  if (!exists) {
    return res.status(404).json({ error: 'Товар OML&CO не найден' });
  }
  products = products.filter(p => p.id !== req.params.id);
  res.status(204).send();
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Маршрут OML&CO не найден' });
});

// Обработчик ошибок
app.use((err, req, res, next) => {
  console.error('Ошибка OML&CO:', err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера OML&CO' });
});

// Запуск сервера
app.listen(port, () => {
  console.log(`🧙‍♂️ OML&CO Сервер запущен на http://localhost:${port}`);
  console.log(`📚 Документация Swagger: http://localhost:${port}/api-docs`);
  console.log('📦 Товаров в лавке OML&CO:', products.length);
});