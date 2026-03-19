const express = require('express');
const cors = require('cors');
const { nanoid } = require('nanoid');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// Подключаем Swagger
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();
const port = process.env.PORT || 3000;

// ========== КОНСТАНТЫ JWT ==========
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'omlco_access_secret_key_2025';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'omlco_refresh_secret_key_2025';
const JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// ========== ХРАНИЛИЩЕ REFRESH-ТОКЕНОВ (в памяти) ==========
// В реальном проекте нужно использовать БД, но для учебных целей подойдёт Set
const refreshTokenStore = new Set();

// ========== РАБОТА С ФАЙЛАМИ ==========
const PRODUCTS_FILE = path.join(__dirname, 'products.json');
const USERS_FILE = path.join(__dirname, 'users.json');

// Создаем файлы, если их нет
async function initFiles() {
  try {
    await fs.access(PRODUCTS_FILE);
  } catch {
    const initialProducts = require('./data');
    await fs.writeFile(PRODUCTS_FILE, JSON.stringify(initialProducts, null, 2));
  }

  try {
    await fs.access(USERS_FILE);
  } catch {
    await fs.writeFile(USERS_FILE, JSON.stringify([], null, 2));
  }
}

initFiles();

// Функции для работы с товарами
async function readProducts() {
  const data = await fs.readFile(PRODUCTS_FILE, 'utf8');
  return JSON.parse(data);
}

async function writeProducts(products) {
  await fs.writeFile(PRODUCTS_FILE, JSON.stringify(products, null, 2));
}

// Функции для работы с пользователями
async function readUsers() {
  const data = await fs.readFile(USERS_FILE, 'utf8');
  return JSON.parse(data);
}

async function writeUsers(users) {
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
}

// Функции для хеширования паролей
async function hashPassword(password) {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

// ========== ФУНКЦИИ ДЛЯ РАБОТЫ С JWT ==========

/**
 * Создание access-токена (короткоживущий, 15 минут)
 */
function generateAccessToken(user) {
  const payload = {
    sub: user.id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    type: 'access'
  };
  
  return jwt.sign(payload, JWT_ACCESS_SECRET, { 
    expiresIn: JWT_ACCESS_EXPIRES_IN 
  });
}

/**
 * Создание refresh-токена (долгоживущий, 7 дней)
 */
function generateRefreshToken(user) {
  const payload = {
    sub: user.id,
    type: 'refresh'
  };
  
  return jwt.sign(payload, JWT_REFRESH_SECRET, { 
    expiresIn: JWT_REFRESH_EXPIRES_IN 
  });
}

/**
 * Валидация access-токена
 */
function verifyAccessToken(token) {
  try {
    return jwt.verify(token, JWT_ACCESS_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Валидация refresh-токена
 */
function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET);
  } catch (error) {
    return null;
  }
}

// ========== MIDDLEWARE ДЛЯ ПРОВЕРКИ АВТОРИЗАЦИИ ==========

/**
 * Middleware для проверки access-токена
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'Требуется авторизация. Используйте заголовок: Authorization: Bearer <token>' 
    });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyAccessToken(token);

  if (!decoded) {
    return res.status(401).json({ 
      error: 'Недействительный или истёкший access-токен' 
    });
  }

  req.user = decoded;
  next();
}

// Middleware
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:3001',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ========== НАСТРОЙКА SWAGGER ==========
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'OML&CO API - Лавка колдовских вещей',
      version: '1.0.0',
      description: `
        API для управления товарами и пользователями в магической лавке OML&CO.
        
        ## 🔐 JWT Аутентификация с refresh-токенами
        
        **Схема работы:**
        1. Регистрация: \`POST /api/auth/register\`
        2. Вход: \`POST /api/auth/login\` → получаете \`accessToken\` (15 мин) и \`refreshToken\` (7 дней)
        3. Для защищённых маршрутов используйте \`Authorization: Bearer <accessToken>\`
        4. Когда accessToken истечёт, отправьте \`POST /api/auth/refresh\` с \`refreshToken\` в теле
        5. Получите новую пару токенов
        
        **Типы токенов:**
        * 🔑 **Access Token** — живёт 15 минут, для доступа к API
        * 🔄 **Refresh Token** — живёт 7 дней, для обновления access-токена (одноразовый)
        
        **Ротация refresh-токенов:**
        * Каждый refresh-токен можно использовать только один раз
        * При обновлении старый токен удаляется, выдаётся новый
      `,
    },
    servers: [
      {
        url: `http://localhost:${port}`,
        description: 'Локальный сервер OML&CO',
      },
    ],
    tags: [
      {
        name: 'Auth',
        description: '🔐 Регистрация, вход и обновление токенов',
      },
      {
        name: 'Products',
        description: '📦 Управление товарами',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Введите JWT access-токен'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'abc12345' },
            email: { type: 'string', example: 'ivan@omlco.ru' },
            first_name: { type: 'string', example: 'Иван' },
            last_name: { type: 'string', example: 'Петров' }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'ivan@omlco.ru' },
            password: { type: 'string', format: 'password', example: 'qwerty123' }
          }
        },
        LoginResponse: {
          type: 'object',
          properties: {
            login: { type: 'boolean', example: true },
            accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIs...' },
            refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIs...' },
            user: { $ref: '#/components/schemas/User' }
          }
        },
        RefreshRequest: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIs...' }
          }
        },
        RefreshResponse: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' }
          }
        }
      }
    }
  },
  apis: ['./app.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'OML&CO API Documentation',
  swaggerOptions: {
    persistAuthorization: true,
  }
}));

// ============= МАРШРУТЫ АУТЕНТИФИКАЦИИ =============

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Регистрация нового пользователя
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - first_name
 *               - last_name
 *               - password
 *             properties:
 *               email: { type: string, example: "ivan@omlco.ru" }
 *               first_name: { type: string, example: "Иван" }
 *               last_name: { type: string, example: "Петров" }
 *               password: { type: string, example: "qwerty123" }
 *     responses:
 *       201:
 *         description: Пользователь создан
 */
app.post('/api/auth/register', async (req, res) => {
  const { email, first_name, last_name, password } = req.body;

  if (!email || !first_name || !last_name || !password) {
    return res.status(400).json({ 
      error: 'Все поля обязательны: email, first_name, last_name, password' 
    });
  }

  try {
    const users = await readUsers();
    
    if (users.find(u => u.email === email)) {
      return res.status(400).json({ error: 'Email уже используется' });
    }

    const hashedPassword = await hashPassword(password);

    const newUser = {
      id: nanoid(8),
      email,
      first_name,
      last_name,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    await writeUsers(users);

    const { password: _, ...userWithoutPassword } = newUser;
    res.status(201).json(userWithoutPassword);

  } catch (error) {
    console.error('Ошибка регистрации:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Вход в систему
 *     description: Возвращает accessToken (15 мин) и refreshToken (7 дней)
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Успешный вход
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 */
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email и пароль обязательны' });
  }

  try {
    const users = await readUsers();
    const user = users.find(u => u.email === email);

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const isPasswordValid = await verifyPassword(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Неверный пароль' });
    }

    // Генерируем токены
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Сохраняем refreshToken в хранилище
    refreshTokenStore.add(refreshToken);

    // Не возвращаем пароль
    const { password: _, ...userWithoutPassword } = user;

    res.json({ 
      login: true,
      accessToken,
      refreshToken,
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Ошибка входа:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Обновление токенов
 *     description: Получает новую пару токенов по refresh-токену (одноразовый)
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshRequest'
 *     responses:
 *       200:
 *         description: Новая пара токенов
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RefreshResponse'
 *       400:
 *         description: refreshToken обязателен
 *       401:
 *         description: Недействительный или использованный refresh-токен
 */
app.post('/api/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: 'refreshToken обязателен' });
  }

  // Проверяем, что токен есть в хранилище (не использован)
  if (!refreshTokenStore.has(refreshToken)) {
    return res.status(401).json({ error: 'Недействительный или использованный refresh-токен' });
  }

  try {
    // Валидируем refresh-токен
    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      // Если токен невалидный, удаляем его из хранилища
      refreshTokenStore.delete(refreshToken);
      return res.status(401).json({ error: 'Недействительный или истёкший refresh-токен' });
    }

    // Находим пользователя
    const users = await readUsers();
    const user = users.find(u => u.id === payload.sub);

    if (!user) {
      // Пользователь не найден - удаляем токен
      refreshTokenStore.delete(refreshToken);
      return res.status(401).json({ error: 'Пользователь не найден' });
    }

    // Ротация refresh-токена: удаляем старый
    refreshTokenStore.delete(refreshToken);

    // Генерируем новую пару токенов
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    // Сохраняем новый refresh-токен
    refreshTokenStore.add(newRefreshToken);

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    });

  } catch (error) {
    console.error('Ошибка обновления токенов:', error);
    refreshTokenStore.delete(refreshToken);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Информация о текущем пользователе
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Данные пользователя
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const users = await readUsers();
    const user = users.find(u => u.id === req.user.sub);
    
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Ошибка:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ============= МАРШРУТЫ ДЛЯ ТОВАРОВ =============

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Получить все товары
 *     tags: [Products]
 *     security: []
 *     responses:
 *       200:
 *         description: Список товаров
 */
app.get('/api/products', async (req, res) => {
  try {
    const products = await readProducts();
    res.json(products);
  } catch (error) {
    console.error('Ошибка:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Получить товар по ID
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *     responses:
 *       200:
 *         description: Товар найден
 */
app.get('/api/products/:id', authMiddleware, async (req, res) => {
  try {
    const products = await readProducts();
    const product = products.find(p => p.id === req.params.id);
    
    if (!product) {
      return res.status(404).json({ error: 'Товар не найден' });
    }
    
    res.json(product);
  } catch (error) {
    console.error('Ошибка:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Создать новый товар
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - category
 *               - description
 *               - price
 *             properties:
 *               title: { type: string }
 *               category: { type: string }
 *               description: { type: string }
 *               price: { type: number }
 *               stock: { type: integer }
 *               rating: { type: number }
 *               image: { type: string }
 *     responses:
 *       201:
 *         description: Товар создан
 */
app.post('/api/products', authMiddleware, async (req, res) => {
  const { title, category, description, price, stock, rating, image } = req.body;

  if (!title || !category || !description || !price) {
    return res.status(400).json({ 
      error: 'Обязательные поля: title, category, description, price' 
    });
  }

  try {
    const products = await readProducts();
    
    const newProduct = {
      id: nanoid(8),
      title: title.trim(),
      category: category.trim(),
      description: description.trim(),
      price: Number(price),
      stock: stock ? Number(stock) : 10,
      rating: rating ? Number(rating) : 0,
      image: image || `https://via.placeholder.com/300x200?text=OML+${encodeURIComponent(title)}`,
      createdBy: req.user.email,
      createdAt: new Date().toISOString()
    };

    products.push(newProduct);
    await writeProducts(products);
    
    res.status(201).json(newProduct);
  } catch (error) {
    console.error('Ошибка:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Обновить товар
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *     requestBody:
 *       required: true
 *     responses:
 *       200:
 *         description: Товар обновлен
 */
app.put('/api/products/:id', authMiddleware, async (req, res) => {
  try {
    const products = await readProducts();
    const index = products.findIndex(p => p.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Товар не найден' });
    }

    const { title, category, description, price, stock, rating, image } = req.body;

    const updatedProduct = {
      ...products[index],
      title: title || products[index].title,
      category: category || products[index].category,
      description: description || products[index].description,
      price: price !== undefined ? Number(price) : products[index].price,
      stock: stock !== undefined ? Number(stock) : products[index].stock,
      rating: rating !== undefined ? Number(rating) : products[index].rating,
      image: image || products[index].image,
      updatedBy: req.user.email,
      updatedAt: new Date().toISOString()
    };

    products[index] = updatedProduct;
    await writeProducts(products);
    
    res.json(updatedProduct);
  } catch (error) {
    console.error('Ошибка:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Удалить товар
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *     responses:
 *       204:
 *         description: Товар удален
 */
app.delete('/api/products/:id', authMiddleware, async (req, res) => {
  try {
    const products = await readProducts();
    const filtered = products.filter(p => p.id !== req.params.id);
    
    if (filtered.length === products.length) {
      return res.status(404).json({ error: 'Товар не найден' });
    }
    
    await writeProducts(filtered);
    res.status(204).send();
  } catch (error) {
    console.error('Ошибка:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Маршрут не найден' });
});

// Обработчик ошибок
app.use((err, req, res, next) => {
  console.error('Ошибка сервера:', err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

// Запуск сервера
app.listen(port, () => {
  console.log(`🧙‍♂️ OML&CO Сервер запущен на http://localhost:${port}`);
  console.log(`📚 Документация Swagger: http://localhost:${port}/api-docs`);
  console.log(`\n🔐 JWT Настройки:`);
  console.log(`   Access Token: ${JWT_ACCESS_EXPIRES_IN}`);
  console.log(`   Refresh Token: ${JWT_REFRESH_EXPIRES_IN}`);
  console.log(`\n📋 Маршруты аутентификации:`);
  console.log(`   POST   /api/auth/register`);
  console.log(`   POST   /api/auth/login`);
  console.log(`   POST   /api/auth/refresh`);
  console.log(`   GET    /api/auth/me (защищён)`);
});