// server/index.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { Expo } = require('expo-server-sdk');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Подключение к базе данных
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Инициализация Expo Push
const expo = new Expo();

// Хранилище токенов: { pairCode: { A: 'ExpoPushToken...', B: '...' } }
const pushTokens = {};

// Функция отправки пуш-уведомления
async function sendPushNotification(toToken, title, body, data = {}) {
  if (!Expo.isExpoPushToken(toToken)) {
    console.error(`❌ Invalid push token: ${toToken}`);
    return;
  }
  
  const messages = [{
    to: toToken,
    sound: 'default',
    title,
    body,
    data,
  }];
  
  const chunks = expo.chunkPushNotifications(messages);
  
  for (const chunk of chunks) {
    try {
      const receipts = await expo.sendPushNotificationsAsync(chunk);
      console.log('✅ Push sent:', receipts);
    } catch (error) {
      console.error('❌ Push error:', error);
    }
  }
}

// Генерация кода пары
app.post('/api/pair/create', async (req, res) => {
  const code = `FEEL-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  
  const { data, error } = await supabase
    .from('pairs')
    .insert({
      id: code,
      user_a: null,
      user_b: null,
      status_a: '⚡',
      status_b: '⚡',
      streak: 0,
      diary: [],
      peace: { active: false, from: null },
      quiz: { q: 'Что для вас значит "время вместе"?', ansA: null, ansB: null, revealed: false }
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating pair:', error);
    return res.status(500).json({ error: 'Database error' });
  }

  console.log(`💑 Новая пара создана: ${code}`);
  res.json({ code });
});

// Подключение по коду
app.post('/api/pair/join', async (req, res) => {
  const { code, userId } = req.body;
  
  const {  pair, error: fetchError } = await supabase
    .from('pairs')
    .select('*')
    .eq('id', code)
    .single();

  if (fetchError || !pair) return res.status(404).json({ error: 'Код не найден' });

  let updateData = {};
  if (!pair.user_a) updateData.user_a = userId;
  else if (!pair.user_b) updateData.user_b = userId;
  else return res.status(400).json({ error: 'Пара уже заполнена' });

  const { error: updateError } = await supabase
    .from('pairs')
    .update(updateData)
    .eq('id', code);

  if (updateError) return res.status(500).json({ error: 'Update error' });

  console.log(`👤 ${userId} присоединился к паре ${code}`);
  const {  updatedPair } = await supabase.from('pairs').select('*').eq('id', code).single();
  res.json({ pairId: code, pair: updatedPair });
});

// Получение данных
app.get('/api/pair/:code', async (req, res) => {
  const { data, error } = await supabase.from('pairs').select('*').eq('id', req.params.code).single();
  if (error || !data) return res.status(404).json({ error: 'Не найдено' });
  res.json(data);
});

// WebSocket: реальное время
io.on('connection', (socket) => {
  console.log('🔌 Клиент подключился:', socket.id);

  // Регистрация токена для пуш-уведомлений
  socket.on('register-push-token', ({ token, userId, pairCode }) => {
    if (!pairCode || !token) return;
    
    if (!pushTokens[pairCode]) pushTokens[pairCode] = {};
    pushTokens[pairCode][userId] = token;
    console.log(`🔔 Токен зарегистрирован: ${userId} в паре ${pairCode}`);
  });

  socket.on('join-pair', (code) => {
    socket.join(code);
    console.log(`👥 Клиент ${socket.id} присоединился к комнате ${code}`);
  });

  socket.on('update-status', async ({ code, user, value }) => {
    const field = user === 'A' ? 'status_a' : 'status_b';
    await supabase.from('pairs').update({ [field]: value }).eq('id', code);
    const { data } = await supabase.from('pairs').select('*').eq('id', code).single();
    io.to(code).emit('status-updated', data);
    
    // Уведомление партнёру
    const partnerId = user === 'A' ? 'B' : 'A';
    const partnerToken = pushTokens[code]?.[partnerId];
    if (partnerToken) {
      const statusEmojis = { '🔴': 'плохо', '🟡': 'нормально', '🟢': 'хорошо', '⚡': 'отлично' };
      await sendPushNotification(partnerToken, '🔋 Статус обновлён', `Партнёр чувствует себя ${statusEmojis[value] || 'изменилось'}`, { screen: 'home' });
    }
  });

  socket.on('complete-ritual', async ({ code }) => {
    const today = new Date().toISOString().split('T')[0];
    const {  pair } = await supabase.from('pairs').select('streak, last_ritual').eq('id', code).single();
    
    let newStreak = pair.streak;
    if (pair.last_ritual !== today) {
      newStreak++;
    }
    
    await supabase.from('pairs').update({ streak: newStreak, last_ritual: today }).eq('id', code);
    const { data } = await supabase.from('pairs').select('*').eq('id', code).single();
    io.to(code).emit('ritual-updated', data);
  });

  socket.on('add-diary', async ({ code, user, text }) => {
    const {  pair } = await supabase.from('pairs').select('diary').eq('id', code).single();
    const newEntry = { by: user, text, date: new Date().toISOString(), id: Date.now() };
    const updatedDiary = [...(pair.diary || []), newEntry];
    
    await supabase.from('pairs').update({ diary: updatedDiary }).eq('id', code);
    const { data } = await supabase.from('pairs').select('*').eq('id', code).single();
    io.to(code).emit('diary-updated', data);
    
    // Уведомление партнёру
    const partnerId = user === 'A' ? 'B' : 'A';
    const partnerToken = pushTokens[code]?.[partnerId];
    if (partnerToken) {
      await sendPushNotification(partnerToken, '💌 Новая запись', `${user} добавил(а) благодарность в дневник`, { screen: 'diary' });
    }
  });

  socket.on('peace-request', async ({ code, user }) => {
    await supabase.from('pairs').update({ peace: { active: true, from: user } }).eq('id', code);
    const { data } = await supabase.from('pairs').select('*').eq('id', code).single();
    io.to(code).emit('peace-updated', data);
    
    // Уведомление партнёру
    const partnerId = user === 'A' ? 'B' : 'A';
    const partnerToken = pushTokens[code]?.[partnerId];
    if (partnerToken) {
      await sendPushNotification(partnerToken, '🕊️ Сигнал мира', `${user} хочет помириться. Нажмите, чтобы увидеть.`, { screen: 'home' });
    }
  });

  socket.on('quiz-submit', async ({ code, user, ans }) => {
    const {  pair } = await supabase.from('pairs').select('quiz').eq('id', code).single();
    const quiz = pair.quiz || {};
    
    if (user === 'A') quiz.ansA = ans;
    else quiz.ansB = ans;
    
    if (quiz.ansA && quiz.ansB) quiz.revealed = true;
    
    await supabase.from('pairs').update({ quiz }).eq('id', code);
    const { data } = await supabase.from('pairs').select('*').eq('id', code).single();
    io.to(code).emit('quiz-updated', data);
  });

  socket.on('disconnect', () => {
    console.log('🔌 Клиент отключился:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🟢 Сервер Feel in запущен на порту ${PORT}`);
  console.log(`💾 Подключено к базе данных Supabase`);
  console.log(`🔔 Push-уведомления готовы к работе`);
});