const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const http = require('http');
const socketIo = require('socket.io');
const { Expo } = require('expo-server-sdk');

const app = express();
const server = http.createServer(app);

const io = socketIo(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], credentials: true }
});

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

console.log('🔑 Supabase URL:', SUPABASE_URL);
console.log('🔑 Supabase Key:', SUPABASE_ANON_KEY ? 'Set (hidden)' : 'MISSING!');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const expo = new Expo();

const userPushTokens = {};
const pairSockets = {};

io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  socket.on('register-push-token', async ({ user, token, pairCode }) => {
    console.log(`📱 Push token registered: User ${user}, Pair ${pairCode}`);
    
    if (!userPushTokens[pairCode]) {
      userPushTokens[pairCode] = {};
    }
    userPushTokens[pairCode][user] = token;
  });

  socket.on('join-pair', (pairId) => {
    console.log(`👥 Socket ${socket.id} joining pair: ${pairId}`);
    socket.join(pairId);
    pairSockets[socket.id] = pairId;
  });

  socket.on('update-status', async ({ code, user, value }) => {
    try {
      const { data: pair, error: fetchError } = await supabase.from('pairs').select('*').eq('code', code).single();
      if (fetchError) throw fetchError;

      const updateField = user === 'M' ? 'status_a' : 'status_b';
      const {  updatedPair, error: updateError } = await supabase
        .from('pairs')
        .update({ [updateField]: value, updated_at: new Date().toISOString() })
        .eq('code', code)
        .select('*')
        .single();

      if (updateError) throw updateError;

      const partner = user === 'M' ? 'Ж' : 'M';
      const partnerToken = userPushTokens[code]?.[partner];
      
      if (partnerToken && Expo.isExpoPushToken(partnerToken)) {
        try {
          await expo.sendPushNotificationsAsync([{
            to: partnerToken,
            sound: 'default',
            title: '💕 Feel In',
            body: `Партнёр обновил настроение: ${value}`,
            data: { code: code, type: 'status' }
          }]);
          console.log('🔔 Push sent: status update');
        } catch (e) {
          console.error('❌ Push error:', e);
        }
      }

      io.to(pairSockets[socket.id]).emit('status-updated', updatedPair);
    } catch (error) {
      console.error('❌ [status] Error:', error);
      socket.emit('error', { event: 'update-status', message: error.message });
    }
  });

  socket.on('complete-ritual', async ({ code, user, text }) => {
    try {
      const { data: pair, error: fetchError } = await supabase.from('pairs').select('*').eq('code', code).single();
      if (fetchError) throw fetchError;

      const ritualField = user === 'M' ? 'ritual_a' : 'ritual_b';
      const today = new Date().toISOString().split('T')[0];
      
      const otherRitualField = user === 'M' ? 'ritual_b' : 'ritual_a';
      const otherPartnerDone = pair[otherRitualField];
      const newStreak = otherPartnerDone ? (pair.streak || 0) + 1 : (pair.streak || 0);

      const {  updatedPair, error: updateError } = await supabase
        .from('pairs')
        .update({ [ritualField]: text, last_ritual: today, streak: newStreak, updated_at: new Date().toISOString() })
        .eq('code', code)
        .select('*')
        .single();

      if (updateError) throw updateError;

      await supabase.from('rituals').insert({
        id: Date.now().toString(), pair_id: updatedPair.id, user_id: user, text, completed: true, completed_at: new Date().toISOString()
      });

      const partner = user === 'M' ? 'Ж' : 'M';
      const partnerToken = userPushTokens[code]?.[partner];
      
      if (partnerToken && Expo.isExpoPushToken(partnerToken)) {
        try {
          await expo.sendPushNotificationsAsync([{
            to: partnerToken,
            sound: 'default',
            title: '❤️ Новый ритуал',
            body: `Партнёр написал: "${text}"`,
            data: { code: code, type: 'ritual' }
          }]);
          console.log('🔔 Push sent: ritual');
        } catch (e) {
          console.error('❌ Push error:', e);
        }
      }

      if ([3, 5, 7].includes(newStreak)) {
        const tokens = userPushTokens[code];
        if (tokens) {
          for (const [u, token] of Object.entries(tokens)) {
            if (Expo.isExpoPushToken(token)) {
              await expo.sendPushNotificationsAsync([{
                to: token,
                sound: 'default',
                title: '🔥 Поздравляем!',
                body: `Вы поддерживаете связь уже ${newStreak} дней подряд! Так держать! 💪`,
                data: { code: code, type: 'streak', days: newStreak }
              }]);
            }
          }
          console.log(`🔥 Streak milestone: ${newStreak} days`);
        }
      }

      io.to(pairSockets[socket.id]).emit('ritual-updated', updatedPair);
    } catch (error) {
      console.error('❌ [ritual] Error:', error);
      socket.emit('error', { event: 'complete-ritual', message: error.message });
    }
  });

  socket.on('add-diary', async ({ code, user, text }) => {
    try {
      const { data: pair, error: fetchError } = await supabase.from('pairs').select('*').eq('code', code).single();
      if (fetchError) throw fetchError;

      const diaryEntry = { id: Date.now().toString(), by: user, text, createdAt: new Date().toISOString() };
      const updatedDiary = [...(pair.diary || []), diaryEntry];

      const {  updatedPair, error: updateError } = await supabase
        .from('pairs')
        .update({ diary: updatedDiary, updated_at: new Date().toISOString() })
        .eq('code', code)
        .select('*')
        .single();

      if (updateError) throw updateError;

      await supabase.from('diary').insert({ id: diaryEntry.id, pair_id: updatedPair.id, user_id: user, text });

      const partner = user === 'M' ? 'Ж' : 'M';
      const partnerToken = userPushTokens[code]?.[partner];
      
      if (partnerToken && Expo.isExpoPushToken(partnerToken)) {
        try {
          await expo.sendPushNotificationsAsync([{
            to: partnerToken,
            sound: 'default',
            title: '📝 Новая запись в дневнике',
            body: `${user} добавил(а) запись`,
            data: { code: code, type: 'diary' }
          }]);
          console.log('🔔 Push sent: diary');
        } catch (e) {
          console.error('❌ Push error:', e);
        }
      }

      io.to(pairSockets[socket.id]).emit('diary-updated', updatedPair);
    } catch (error) {
      console.error('❌ [diary] Error:', error);
      socket.emit('error', { event: 'add-diary', message: error.message });
    }
  });

  // ✅ КНОПКА МИР + PUSH
  socket.on('peace-request', async ({ code, user }) => {
    try {
      const { data: pair, error: fetchError } = await supabase.from('pairs').select('*').eq('code', code).single();
      if (fetchError) throw fetchError;

      const peaceData = { active: true, from: user, timestamp: new Date().toISOString() };
      const {  updatedPair, error: updateError } = await supabase
        .from('pairs')
        .update({ peace: peaceData, updated_at: new Date().toISOString() })
        .eq('code', code)
        .select('*')
        .single();

      if (updateError) throw updateError;
      
      await supabase.from('peace').insert({ 
        id: Date.now().toString(), 
        pair_id: updatedPair.id, 
        from_user: user, 
        active: true 
      });

      // 🔔 ОТПРАВКА PUSH ПАРТНЁРУ
      const partner = user === 'M' ? 'Ж' : 'M';
      const partnerToken = userPushTokens[code]?.[partner];
      
      if (partnerToken && Expo.isExpoPushToken(partnerToken)) {
        try {
          await expo.sendPushNotificationsAsync([{
            to: partnerToken,
            sound: 'default',
            title: '🤝 Сигнал мира',
            body: 'Партнёр хочет помириться',
            data: { code: code, type: 'peace' }
          }]);
          console.log('🔔 Push sent: peace request');
        } catch (e) {
          console.error('❌ Push error:', e);
        }
      }

      io.to(pairSockets[socket.id]).emit('peace-updated', updatedPair);
    } catch (error) {
      console.error('❌ [peace] Error:', error);
      socket.emit('error', { event: 'peace-request', message: error.message });
    }
  });

  socket.on('quiz-submit', async ({ code, user, ans }) => {
    try {
      const { data: pair, error: fetchError } = await supabase.from('pairs').select('*').eq('code', code).single();
      if (fetchError) throw fetchError;

      const quizField = user === 'M' ? 'ans_a' : 'ans_b';
      const currentQuiz = pair.quiz || {};
      const updatedQuiz = { ...currentQuiz, [quizField]: ans, question: currentQuiz.question || 'Daily Question' };
      const bothAnswered = updatedQuiz.ans_a && updatedQuiz.ans_b;
      
      const {  updatedPair, error: updateError } = await supabase
        .from('pairs')
        .update({ quiz: { ...updatedQuiz, revealed: bothAnswered }, updated_at: new Date().toISOString() })
        .eq('code', code)
        .select('*')
        .single();

      if (updateError) throw updateError;
      if (bothAnswered) {
        await supabase.from('quiz').insert({
          id: Date.now().toString(), pair_id: updatedPair.id, question: updatedQuiz.question,
          ans_a: updatedQuiz.ans_a, ans_b: updatedQuiz.ans_b, revealed: true
        });
      }
      io.to(pairSockets[socket.id]).emit('quiz-updated', updatedPair);
    } catch (error) {
      console.error('❌ [quiz] Error:', error);
      socket.emit('error', { event: 'quiz-submit', message: error.message });
    }
  });

  socket.on('disconnect', () => {
    const pairId = pairSockets[socket.id];
    if (pairId) { socket.leave(pairId); delete pairSockets[socket.id]; }
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), supabase: SUPABASE_URL ? 'configured' : 'missing' });
});

app.post('/api/pair/create', async (req, res) => {
  try {
    let code, data, error, attempts = 0;
    do {
      code = 'FEEL-' + Math.random().toString(36).substring(2, 6).toUpperCase();
      const result = await supabase
        .from('pairs')
        .insert({ id: Date.now().toString(), code, streak: 0, created_at: new Date().toISOString() })
        .select()
        .single();
      data = result.data;
      error = result.error;
      attempts++;
    } while (error?.code === '23505' && attempts < 5);

    if (error) throw error;
    res.json({ success: true, code, pairId: data.id });
  } catch (error) {
    console.error('❌ [API] Failed to create pair:', error);
    res.status(500).json({ error: 'Failed to create pair', details: error.message });
  }
});

app.post('/api/pair/join', async (req, res) => {
  try {
    const { code, userId } = req.body;
    const {  pair, error: fetchError } = await supabase.from('pairs').select('*').eq('code', code.toUpperCase()).single();
    if (fetchError) throw fetchError;
    if (!pair) return res.status(404).json({ error: 'Pair not found' });

    const userField = userId === 'M' ? 'user_a' : 'user_b';
    const { data: updatedPair, error: updateError } = await supabase
      .from('pairs')
      .update({ [userField]: userId, updated_at: new Date().toISOString() })
      .eq('code', code.toUpperCase())
      .select('*')
      .single();

    if (updateError) throw updateError;
    res.json({ success: true, pair: updatedPair, pairId: pair.id });
  } catch (error) {
    console.error('❌ [API] Failed to join pair:', error);
    res.status(500).json({ error: 'Failed to join pair', details: error.message });
  }
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Server running on port', PORT);
  console.log('📡 Socket.IO ready');
  console.log(' Push Notifications enabled');
  console.log('🗄️ Supabase:', SUPABASE_URL ? '✓ Connected' : '✗ Not configured');
});

process.on('unhandledRejection', (reason) => console.error('❌ Unhandled Rejection:', reason));
process.on('uncaughtException', (error) => { console.error('❌ Uncaught Exception:', error); process.exit(1); });