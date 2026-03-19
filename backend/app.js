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

// ========== ХРАНИЛИЩЕ REFRESH-ТОКЕНОВ ==========
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
    // Создаём админа по умолчанию
    const defaultAdmin = [
      {
        id: nanoid(8),
        email: 'admin@omlco.ru',
        first_name: 'Админ',
        last_name: 'Главный',
        password: await bcrypt.hash('admin123', 10),
        role: 'admin',
        isActive: true,
        createdAt: new Date().toISOString()
      }
    ];
    await fs.writeFile(USERS_FILE, JSON.stringify(defaultAdmin, null, 2));
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

function generateAccessToken(user) {
  const payload = {
    sub: user.id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    role: user.role
  };
  
  return jwt.sign(payload, JWT_ACCESS_SECRET, { 
    expiresIn: JWT_ACCESS_EXPIRES_IN 
  });
}

function generateRefreshToken(user) {
  const payload = {
    sub: user.id,
    role: user.role
  };
  
  return jwt.sign(payload, JWT_REFRESH_SECRET, { 
    expiresIn: JWT_REFRESH_EXPIRES_IN 
  });
}

function verifyAccessToken(token) {
  try {
    return jwt.verify(token, JWT_ACCESS_SECRET);
  } catch (error) {
    return null;
  }
}

function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET);
  } catch (error) {
    return null;
  }
}

// ========== MIDDLEWARE ==========

// Проверка аутентификации
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyAccessToken(token);

  if (!decoded) {
    return res.status(401).json({ error: 'Недействительный или истёкший токен' });
  }

  req.user = decoded;
  next();
}

// Проверка ролей
function roleMiddleware(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Требуется авторизация' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Доступ запрещён. Требуется роль: ' + allowedRoles.join(' или ') 
      });
    }

    next();
  };
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
      title: 'OML&CO API - RBAC',
      version: '1.0.0',
      description: `
        API для управления товарами и пользователями с системой ролей.
        
        ## 👥 Роли:
        * **Гость** - не аутентифицирован
        * **Пользователь** - только просмотр товаров
        * **Продавец** - создание и редактирование товаров
        * **Администратор** - всё + управление пользователями
        
        ## 🔐 Доступ:
        * Публичные маршруты: регистрация, вход, обновление токенов
        * Защищённые маршруты: требуют токен и определённую роль
      `,
    },
    servers: [
      { url: `http://localhost:${port}`, description: 'Локальный сервер' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        }
      }
    }
  },
  apis: ['./app.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ============= ПУБЛИЧНЫЕ МАРШРУТЫ (Гость) =============

// Регистрация
app.post('/api/auth/register', async (req, res) => {
  const { email, first_name, last_name, password } = req.body;

  if (!email || !first_name || !last_name || !password) {
    return res.status(400).json({ error: 'Все поля обязательны' });
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
      role: 'user', // По умолчанию обычный пользователь
      isActive: true,
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

// Вход
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email и пароль обязательны' });
  }

  try {
    const users = await readUsers();
    const user = users.find(u => u.email === email && u.isActive !== false);

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден или заблокирован' });
    }

    const isPasswordValid = await verifyPassword(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Неверный пароль' });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    refreshTokenStore.add(refreshToken);

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

// Обновление токенов
app.post('/api/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: 'refreshToken обязателен' });
  }

  if (!refreshTokenStore.has(refreshToken)) {
    return res.status(401).json({ error: 'Недействительный refresh-токен' });
  }

  try {
    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      refreshTokenStore.delete(refreshToken);
      return res.status(401).json({ error: 'Недействительный refresh-токен' });
    }

    const users = await readUsers();
    const user = users.find(u => u.id === payload.sub && u.isActive !== false);

    if (!user) {
      refreshTokenStore.delete(refreshToken);
      return res.status(401).json({ error: 'Пользователь не найден' });
    }

    refreshTokenStore.delete(refreshToken);

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

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

// ============= МАРШРУТЫ ДЛЯ АУТЕНТИФИЦИРОВАННЫХ (Пользователь+) =============

// Информация о текущем пользователе (доступно всем аутентифицированным)
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

// Получить все товары (доступно всем аутентифицированным)
app.get('/api/products', authMiddleware, async (req, res) => {
  try {
    const products = await readProducts();
    res.json(products);
  } catch (error) {
    console.error('Ошибка:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получить товар по ID (доступно всем аутентифицированным)
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

// Создать товар (только продавец и админ)
app.post('/api/products', 
  authMiddleware, 
  roleMiddleware(['seller', 'admin']), 
  async (req, res) => {
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

// Обновить товар (только продавец и админ)
app.put('/api/products/:id', 
  authMiddleware, 
  roleMiddleware(['seller', 'admin']), 
  async (req, res) => {
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

// Удалить товар (только админ)
app.delete('/api/products/:id', 
  authMiddleware, 
  roleMiddleware(['admin']), 
  async (req, res) => {
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

// ============= МАРШРУТЫ ДЛЯ УПРАВЛЕНИЯ ПОЛЬЗОВАТЕЛЯМИ (только админ) =============

// Получить всех пользователей
app.get('/api/users', 
  authMiddleware, 
  roleMiddleware(['admin']), 
  async (req, res) => {
    try {
      const users = await readUsers();
      // Убираем пароли из ответа
      const usersWithoutPasswords = users.map(({ password, ...rest }) => rest);
      res.json(usersWithoutPasswords);
    } catch (error) {
      console.error('Ошибка:', error);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получить пользователя по ID
app.get('/api/users/:id', 
  authMiddleware, 
  roleMiddleware(['admin']), 
  async (req, res) => {
    try {
      const users = await readUsers();
      const user = users.find(u => u.id === req.params.id);
      
      if (!user) {
        return res.status(404).json({ error: 'Пользователь не найден' });
      }

      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Ошибка:', error);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Обновить информацию пользователя
app.put('/api/users/:id', 
  authMiddleware, 
  roleMiddleware(['admin']), 
  async (req, res) => {
    try {
      const users = await readUsers();
      const index = users.findIndex(u => u.id === req.params.id);
      
      if (index === -1) {
        return res.status(404).json({ error: 'Пользователь не найден' });
      }

      const { first_name, last_name, email, role, isActive } = req.body;

      // Нельзя менять свой собственный статус (для безопасности)
      if (req.params.id === req.user.sub && isActive === false) {
        return res.status(400).json({ error: 'Нельзя заблокировать самого себя' });
      }

      const updatedUser = {
        ...users[index],
        first_name: first_name || users[index].first_name,
        last_name: last_name || users[index].last_name,
        email: email || users[index].email,
        role: role || users[index].role,
        isActive: isActive !== undefined ? isActive : users[index].isActive,
        updatedAt: new Date().toISOString()
      };

      users[index] = updatedUser;
      await writeUsers(users);

      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Ошибка:', error);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Удалить/заблокировать пользователя
app.delete('/api/users/:id', 
  authMiddleware, 
  roleMiddleware(['admin']), 
  async (req, res) => {
    try {
      // Нельзя удалить самого себя
      if (req.params.id === req.user.sub) {
        return res.status(400).json({ error: 'Нельзя удалить самого себя' });
      }

      const users = await readUsers();
      const filtered = users.filter(u => u.id !== req.params.id);
      
      if (filtered.length === users.length) {
        return res.status(404).json({ error: 'Пользователь не найден' });
      }
      
      await writeUsers(filtered);
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
  console.log(`\n👥 Роли:`);
  console.log(`   - Гость (не аутентифицирован)`);
  console.log(`   - Пользователь (просмотр товаров)`);
  console.log(`   - Продавец (создание/редактирование товаров)`);
  console.log(`   - Администратор (полный доступ)`);
  console.log(`\n📋 Маршруты:`);
  console.log(`   🔓 Публичные: /api/auth/*`);
  console.log(`   👤 Пользователь: GET /api/products, /api/products/:id, /api/auth/me`);
  console.log(`   🛒 Продавец: + POST/PUT /api/products`);
  console.log(`   👑 Админ: + DELETE /api/products, /api/users/*`);
});