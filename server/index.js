// server/index.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { 
  cors: { 
    origin: '*', 
    methods: ['GET', 'POST'] 
  } 
});

const DB_PATH = path.join(__dirname, 'data.json');

// Загрузка данных
const loadData = () => {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ pairs: {} }));
    return { pairs: {} };
  }
  return JSON.parse(fs.readFileSync(DB_PATH));
};

// Сохранение данных
const saveData = (data) => {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
};

// 🔗 API: Создать пару
app.post('/api/pair/create', (req, res) => {
  const code = `FEEL-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const data = loadData();
  
  data.pairs[code] = {
    id: code,
    userA: null,
    userB: null,
    statusA: '⚡',
    statusB: '⚡',
    streak: 0,
    lastRitual: null,
    diary: [],
    peace: { active: false, from: null },
    quiz: { 
      q: 'Что для вас значит "время вместе"?', 
      ansA: null, 
      ansB: null, 
      revealed: false 
    }
  };
  
  saveData(data);
  console.log(`💑 Новая пара создана: ${code}`);
  res.json({ code });
});

// 🔗 API: Присоединиться к паре
app.post('/api/pair/join', (req, res) => {
  const { code, userId } = req.body;
  const data = loadData();
  const pair = data.pairs[code];
  
  if (!pair) return res.status(404).json({ error: 'Код пары не найден' });
  if (pair.userA && pair.userB) {
    return res.status(400).json({ error: 'Эта пара уже заполнена' });
  }
  
  if (!pair.userA) pair.userA = userId;
  else if (!pair.userB) pair.userB = userId;
  
  saveData(data);
  console.log(`👤 ${userId} присоединился к паре ${code}`);
  res.json({ pairId: code, pair });
});

// 🔗 API: Получить данные пары
app.get('/api/pair/:code', (req, res) => {
  const data = loadData();
  const pair = data.pairs[req.params.code];
  if (!pair) return res.status(404).json({ error: 'Пара не найдена' });
  res.json(pair);
});

// ⚡ WebSocket: реальное время
io.on('connection', (socket) => {
  console.log('🔌 Клиент подключился');
  
  socket.on('join-pair', (code) => {
    socket.join(code);
    console.log(`🔗 Клиент вошёл в комнату: ${code}`);
  });
  
  socket.on('update-status', ({ code, user, value }) => {
    const data = loadData();
    if (data.pairs[code]) {
      if (user === 'A') data.pairs[code].statusA = value;
      else data.pairs[code].statusB = value;
      saveData(data);
      io.to(code).emit('status-updated', data.pairs[code]);
      console.log(`📊 Статус обновлён: ${user} → ${value}`);
    }
  });
  
  socket.on('complete-ritual', ({ code }) => {
    const data = loadData();
    if (data.pairs[code]) {
      const today = new Date().toISOString().split('T')[0];
      if (data.pairs[code].lastRitual !== today) {
        data.pairs[code].streak++;
        data.pairs[code].lastRitual = today;
        saveData(data);
        console.log(`🔥 Streak увеличен: ${data.pairs[code].streak}`);
      }
      io.to(code).emit('ritual-updated', data.pairs[code]);
    }
  });
  
  socket.on('add-diary', ({ code, user, text }) => {
    const data = loadData();
    if (data.pairs[code]) {
      data.pairs[code].diary.push({ 
        by: user, 
        text, 
        date: new Date().toISOString(),
        id: Date.now() 
      });
      saveData(data);
      io.to(code).emit('diary-updated', data.pairs[code]);
      console.log(`📝 Новая запись в дневнике от ${user}`);
    }
  });
  
  socket.on('peace-request', ({ code, user }) => {
    const data = loadData();
    if (data.pairs[code]) {
      data.pairs[code].peace = { active: true, from: user, timestamp: Date.now() };
      saveData(data);
      io.to(code).emit('peace-updated', data.pairs[code]);
      console.log(`🤝 Запрос мира от ${user}`);
    }
  });
  
  socket.on('peace-accept', ({ code }) => {
    const data = loadData();
    if (data.pairs[code]) {
      data.pairs[code].peace = { active: false, from: null };
      saveData(data);
      io.to(code).emit('peace-updated', data.pairs[code]);
      console.log(`✅ Мир принят в паре ${code}`);
    }
  });
  
  socket.on('quiz-submit', ({ code, user, ans }) => {
    const data = loadData();
    if (data.pairs[code]) {
      if (user === 'A') data.pairs[code].quiz.ansA = ans;
      else data.pairs[code].quiz.ansB = ans;
      
      if (data.pairs[code].quiz.ansA && data.pairs[code].quiz.ansB) {
        data.pairs[code].quiz.revealed = true;
      }
      saveData(data);
      io.to(code).emit('quiz-updated', data.pairs[code]);
      console.log(`❓ Ответ от ${user}: ${ans}`);
    }
  });
  
  socket.on('disconnect', () => {
    console.log('🔌 Клиент отключился');
  });
});

// 🟢 Запуск сервера
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🟢 Сервер Feel in запущен на порту ${PORT}`);
  console.log(`🌐 Доступен по: http://localhost:${PORT}`);
});