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
 * Создание access-токена (короткоживущий)
 */
function generateAccessToken(user) {
  const payload = {
    sub: user.id,           // subject - идентификатор пользователя
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
 * Создание refresh-токена (долгоживущий)
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
 * Ожидает заголовок: Authorization: Bearer <token>
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
      error: 'Недействительный или истёкший токен' 
    });
  }

  // Добавляем информацию о пользователе в запрос
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
        
        ## 🔐 JWT Аутентификация
        Для доступа к защищённым маршрутам требуется JWT токен.
        
        **Схема работы:**
        1. Регистрация: \`POST /api/auth/register\`
        2. Вход: \`POST /api/auth/login\` → получаете \`accessToken\` и \`refreshToken\`
        3. Для защищённых маршрутов добавляйте заголовок: \`Authorization: Bearer <accessToken>\`
        4. Когда accessToken истечёт, используйте \`POST /api/auth/refresh\` для получения новой пары токенов
        
        **Типы токенов:**
        * 🔑 **Access Token** — живёт 15 минут, используется для доступа к API
        * 🔄 **Refresh Token** — живёт 7 дней, используется для обновления access-токена
        
        **Защищённые маршруты (требуют токен):**
        * \`GET    /api/auth/me\` - информация о текущем пользователе
        * \`POST   /api/auth/refresh\` - обновление токенов
        * \`POST   /api/products\` - создание товара
        * \`GET    /api/products/:id\` - получение товара (защищён)
        * \`PUT    /api/products/:id\` - обновление товара
        * \`DELETE /api/products/:id\` - удаление товара
        
        **Публичные маршруты (доступны без токена):**
        * \`POST   /api/auth/register\` - регистрация
        * \`POST   /api/auth/login\` - вход
        * \`GET    /api/products\` - список всех товаров
      `,
      contact: {
        name: 'OML&CO',
        url: 'http://localhost:3001',
      },
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
        description: '🔐 Регистрация, вход и управление токенами',
      },
      {
        name: 'Products',
        description: '📦 Управление товарами (защищённые маршруты)',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Введите JWT access-токен, полученный при входе'
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
        Product: {
          type: 'object',
          required: ['title', 'category', 'description', 'price'],
          properties: {
            id: { type: 'string', example: 'abc12345' },
            title: { type: 'string', example: 'Зелье от похмелья' },
            category: { type: 'string', example: 'Зелья OML' },
            description: { type: 'string', example: 'Фирменное зелье OML&CO' },
            price: { type: 'number', example: 299 },
            stock: { type: 'integer', example: 42 },
            rating: { type: 'number', example: 4.7 },
            image: { type: 'string', example: '/images/zelye.jpg' },
            createdBy: { type: 'string', example: 'ivan@omlco.ru' },
            createdAt: { type: 'string', format: 'date-time' }
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
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Ошибка авторизации' }
          }
        }
      }
    }
  },
  apis: ['./app.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Кастомизация Swagger UI
const swaggerUiOptions = {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'OML&CO API Documentation',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
  }
};

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

// ============= МАРШРУТЫ АУТЕНТИФИКАЦИИ =============

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Регистрация нового пользователя
 *     description: Создаёт нового пользователя с хешированием пароля
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
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "ivan@omlco.ru"
 *               first_name:
 *                 type: string
 *                 example: "Иван"
 *               last_name:
 *                 type: string
 *                 example: "Петров"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "qwerty123"
 *     responses:
 *       201:
 *         description: Пользователь успешно создан
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 email:
 *                   type: string
 *                 first_name:
 *                   type: string
 *                 last_name:
 *                   type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Ошибка валидации
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
    
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
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
    res.status(201).json({ 
      ...userWithoutPassword,
      message: 'Пользователь успешно зарегистрирован' 
    });

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
 *     description: Проверяет email и пароль, возвращает access и refresh токены
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
 *       400:
 *         description: Не указаны email или пароль
 *       401:
 *         description: Неверный пароль
 *       404:
 *         description: Пользователь не найден
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

    if (isPasswordValid) {
      const { password: _, ...userWithoutPassword } = user;
      
      // Генерируем токены
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      // В реальном проекте refreshToken нужно сохранить в БД
      // Здесь для простоты сохраняем в том же файле users.json
      user.refreshToken = refreshToken;
      await writeUsers(users);
      
      res.json({ 
        login: true, 
        accessToken,
        refreshToken,
        user: userWithoutPassword,
        message: 'Вход выполнен успешно' 
      });
    } else {
      res.status(401).json({ error: 'Неверный пароль' });
    }

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
 *     description: Получает новую пару access и refresh токенов по действующему refresh токену
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: "eyJhbGciOiJIUzI1NiIs..."
 *     responses:
 *       200:
 *         description: Токены успешно обновлены
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       401:
 *         description: Недействительный refresh токен
 */
app.post('/api/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: 'refreshToken обязателен' });
  }

  try {
    // Проверяем refresh токен
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return res.status(401).json({ error: 'Недействительный refresh токен' });
    }

    // Ищем пользователя
    const users = await readUsers();
    const user = users.find(u => u.id === decoded.sub);

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ error: 'Пользователь не найден или токен недействителен' });
    }

    // Генерируем новые токены
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    // Обновляем refresh токен в БД
    user.refreshToken = newRefreshToken;
    await writeUsers(users);

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    });

  } catch (error) {
    console.error('Ошибка обновления токенов:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Информация о текущем пользователе
 *     description: Возвращает данные авторизованного пользователя (требуется токен)
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
 *       401:
 *         description: Не авторизован
 */
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const users = await readUsers();
    const user = users.find(u => u.id === req.user.sub);
    
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const { password: _, refreshToken: __, ...userWithoutSensitive } = user;
    res.json(userWithoutSensitive);
  } catch (error) {
    console.error('Ошибка получения пользователя:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ============= ПУБЛИЧНЫЕ МАРШРУТЫ ДЛЯ ТОВАРОВ =============

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Получить все товары
 *     description: Публичный доступ, не требует авторизации
 *     tags: [Products]
 *     security: []
 *     responses:
 *       200:
 *         description: Список товаров
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
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

// ============= ЗАЩИЩЁННЫЕ МАРШРУТЫ ДЛЯ ТОВАРОВ =============

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Получить товар по ID
 *     description: Требуется авторизация (JWT токен)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Товар найден
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       401:
 *         description: Не авторизован
 *       404:
 *         description: Товар не найден
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
 *     description: Требуется авторизация (JWT токен)
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
 *               title:
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
 *         description: Товар создан
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Ошибка валидации
 *       401:
 *         description: Не авторизован
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
 *     summary: Обновить товар полностью
 *     description: Требуется авторизация (JWT токен)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Product'
 *     responses:
 *       200:
 *         description: Товар обновлен
 *       401:
 *         description: Не авторизован
 *       404:
 *         description: Товар не найден
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
 *     description: Требуется авторизация (JWT токен)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Товар удален
 *       401:
 *         description: Не авторизован
 *       404:
 *         description: Товар не найден
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
  console.log(`\n📋 Маршруты:`);
  console.log(`   🔓 Публичные:`);
  console.log(`   POST   /api/auth/register`);
  console.log(`   POST   /api/auth/login`);
  console.log(`   GET    /api/products (публичный)`);
  console.log(`   🔒 Защищённые (требуют Bearer токен):`);
  console.log(`   GET    /api/auth/me`);
  console.log(`   POST   /api/auth/refresh`);
  console.log(`   GET    /api/products/:id`);
  console.log(`   POST   /api/products`);
  console.log(`   PUT    /api/products/:id`);
  console.log(`   DELETE /api/products/:id`);
});