const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcrypt');

async function createUsers() {
  // Явно задаём пароли и хешируем их
  const adminPassword = 'admin123';
  const sellerPassword = 'seller123';
  const userPassword = 'user123';

  const adminHash = await bcrypt.hash(adminPassword, 10);
  const sellerHash = await bcrypt.hash(sellerPassword, 10);
  const userHash = await bcrypt.hash(userPassword, 10);

  console.log('Admin hash:', adminHash);
  console.log('Seller hash:', sellerHash);
  console.log('User hash:', userHash);

  const users = [
    {
      id: 'admin123',
      email: 'admin@omlco.ru',
      first_name: 'Главный',
      last_name: 'Администратор',
      password: adminHash,
      role: 'admin',
      isActive: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'seller456',
      email: 'seller@omlco.ru',
      first_name: 'Торговый',
      last_name: 'Продавец',
      password: sellerHash,
      role: 'seller',
      isActive: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'user789',
      email: 'user@omlco.ru',
      first_name: 'Обычный',
      last_name: 'Пользователь',
      password: userHash,
      role: 'user',
      isActive: true,
      createdAt: new Date().toISOString()
    }
  ];

  const usersFile = path.join(__dirname, 'users.json');
  await fs.writeFile(usersFile, JSON.stringify(users, null, 2));
  console.log('✅ Пользователи созданы!');
  console.log('📧 admin@omlco.ru / admin123');
  console.log('📧 seller@omlco.ru / seller123');
  console.log('📧 user@omlco.ru / user123');
}

createUsers();