const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// Хранилище пар (в памяти)
const pairs = {};

// Генерация кода пары
const generateCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = 'FEEL-';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

// API: Создать пару
app.post('/api/pair/create', (req, res) => {
  const code = generateCode();
  pairs[code] = {
    id: code,
    statusM: null,
    statusЖ: null,
    streak: 0,
    lastRitual: null,
    diary: [],
    peace: null,
    quiz: {
      q: 'Что для вас важнее в отношениях?',
      ansM: null,
      ansЖ: null,
      revealed: false
    },
    createdAt: new Date()
  };
  console.log('Создана пара:', code);
  res.json({ code });
});

// API: Войти в пару
app.post('/api/pair/join', (req, res) => {
  const { code, userId } = req.body;
  const pair = pairs[code.toUpperCase()];
  
  if (!pair) {
    return res.status(404).json({ error: 'Пара не найдена' });
  }
  
  console.log(`Пользователь ${userId} вошёл в пару ${code}`);
  res.json({ pair, pairId: code });
});

// API: Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', pairs: Object.keys(pairs).length });
});

app.get('/', (req, res) => {
  res.send('Feel in Server is running! 🚀');
});

// Socket.IO подключения
io.on('connection', (socket) => {
  console.log('Подключился клиент:', socket.id);

  socket.on('join-pair', (pairId) => {
    socket.join(pairId);
    console.log(`Клиент ${socket.id} присоединился к паре ${pairId}`);
  });

  socket.on('update-status', ({ code, user, value }) => {
    const pair = pairs[code];
    if (!pair) return;
    
    if (user === 'M') pair.statusM = value;
    else if (user === 'Ж') pair.statusЖ = value;
    
    io.to(code).emit('status-updated', pair);
    console.log(`Статус обновлён: ${code} ${user} = ${value}`);
  });

  socket.on('complete-ritual', ({ code }) => {
    const pair = pairs[code];
    if (!pair) return;
    
    pair.streak = (pair.streak || 0) + 1;
    pair.lastRitual = new Date();
    
    io.to(code).emit('ritual-updated', pair);
    console.log(`Ритуал выполнен: ${code}, streak: ${pair.streak}`);
  });

  socket.on('add-diary', ({ code, user, text }) => {
    const pair = pairs[code];
    if (!pair) return;
    
    pair.diary = pair.diary || [];
    pair.diary.push({
      id: Date.now(),
      by: user,
      text,
      timestamp: new Date()
    });
    
    io.to(code).emit('diary-updated', pair);
    console.log(`Запись в дневник: ${code} ${user}`);
  });

  socket.on('peace-request', ({ code, user }) => {
    const pair = pairs[code];
    if (!pair) return;
    
    pair.peace = {
      active: true,
      from: user,
      timestamp: new Date()
    };
    
    io.to(code).emit('peace-updated', pair);
    console.log(`Сигнал мира: ${code} от ${user}`);
  });

  socket.on('quiz-submit', ({ code, user, ans }) => {
    const pair = pairs[code];
    if (!pair) return;
    
    if (user === 'M') pair.quiz.ansM = ans;
    else if (user === 'Ж') pair.quiz.ansЖ = ans;
    
    // Если оба ответили
    if (pair.quiz.ansM && pair.quiz.ansЖ) {
      pair.quiz.revealed = true;
    }
    
    io.to(code).emit('quiz-updated', pair);
    console.log(`Викторина: ${code} ${user} = ${ans}`);
  });

  socket.on('disconnect', () => {
    console.log('Клиент отключился:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});