const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
  }
});

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

console.log('🔑 Supabase URL:', SUPABASE_URL);
console.log('🔑 Supabase Key:', SUPABASE_ANON_KEY ? 'Set (hidden)' : 'MISSING!');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false }
});

const pairSockets = {};

io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  socket.on('join-pair', (pairId) => {
    console.log(`👥 Socket ${socket.id} joining pair: ${pairId}`);
    socket.join(pairId);
    pairSockets[socket.id] = pairId;
  });

  // ✅ ОБНОВЛЕНИЕ СТАТУСА
  socket.on('update-status', async ({ code, user, value }) => {
    console.log('📥 [status] Received:', { code, user, value });
    try {
      // Находим пару
      const {  pair, error: fetchError } = await supabase
        .from('pairs')
        .select('*')
        .eq('code', code)
        .single();

      if (fetchError) {
        console.error('❌ [status] Fetch error:', fetchError);
        throw fetchError;
      }

      // Определяем какое поле обновлять
      const updateField = user === 'M' ? 'status_a' : 'status_b';
      
      // Обновляем статус
      const { data: updatedPair, error: updateError } = await supabase
        .from('pairs')
        .update({ 
          [updateField]: value,
          updated_at: new Date().toISOString()
        })
        .eq('code', code)
        .select('*')  // ✅ ВАЖНО: возвращаем все поля
        .single();

      if (updateError) {
        console.error('❌ [status] Update error:', updateError);
        throw updateError;
      }

      console.log('✅ [status] Updated:', updatedPair);
      io.to(pairSockets[socket.id]).emit('status-updated', updatedPair);
    } catch (error) {
      console.error('❌ [status] Error:', error);
      socket.emit('error', { event: 'update-status', message: error.message });
    }
  });

  // ✅ ВЫПОЛНЕНИЕ РИТУАЛА (с увеличением streak)
  socket.on('complete-ritual', async ({ code, user, text }) => {
    console.log('📥 [ritual] Received:', { code, user, text: text?.slice(0, 30) });
    try {
      // Находим пару
      const {  pair, error: fetchError } = await supabase
        .from('pairs')
        .select('*')
        .eq('code', code)
        .single();

      if (fetchError) {
        console.error('❌ [ritual] Fetch error:', fetchError);
        throw fetchError;
      }

      // Определяем поле
      const ritualField = user === 'M' ? 'ritual_a' : 'ritual_b';
      
      // Проверяем, выполнял ли уже сегодня
      const today = new Date().toISOString().split('T')[0];
      if (pair.last_ritual === today) {
        console.log('⚠️ [ritual] Already completed today');
        return;
      }

      // ✅ Увеличиваем streak ТОЛЬКО если оба выполнили ритуал
      const otherRitualField = user === 'M' ? 'ritual_b' : 'ritual_a';
      const otherPartnerDone = pair[otherRitualField];
      const newStreak = otherPartnerDone ? (pair.streak || 0) + 1 : (pair.streak || 0);

      // Обновляем пару
      const { data: updatedPair, error: updateError } = await supabase
        .from('pairs')
        .update({ 
          [ritualField]: text,
          last_ritual: today,
          streak: newStreak,
          updated_at: new Date().toISOString()
        })
        .eq('code', code)
        .select('*')  // ✅ Возвращаем обновленные данные
        .single();

      if (updateError) {
        console.error('❌ [ritual] Update error:', updateError);
        throw updateError;
      }

      // Сохраняем в отдельную таблицу
      await supabase
        .from('rituals')
        .insert({
          id: Date.now().toString(),
          pair_id: updatedPair.id,
          user_id: user,
          text: text,
          completed: true,
          completed_at: new Date().toISOString()
        });

      console.log('✅ [ritual] Updated, streak:', newStreak);
      io.to(pairSockets[socket.id]).emit('ritual-updated', updatedPair);
    } catch (error) {
      console.error('❌ [ritual] Error:', error);
      socket.emit('error', { event: 'complete-ritual', message: error.message });
    }
  });

  // ✅ ДОБАВЛЕНИЕ В ДНЕВНИК
  socket.on('add-diary', async ({ code, user, text }) => {
    console.log('📥 [diary] Received:', { code, user, text: text?.slice(0, 30) });
    try {
      const {  pair, error: fetchError } = await supabase
        .from('pairs')
        .select('*')
        .eq('code', code)
        .single();

      if (fetchError) throw fetchError;

      const diaryEntry = {
        id: Date.now().toString(),
        by: user,
        text: text,
        createdAt: new Date().toISOString()
      };

      const updatedDiary = [...(pair.diary || []), diaryEntry];

      const {  updatedPair, error: updateError } = await supabase
        .from('pairs')
        .update({ 
          diary: updatedDiary,
          updated_at: new Date().toISOString()
        })
        .eq('code', code)
        .select('*')
        .single();

      if (updateError) throw updateError;

      await supabase
        .from('diary')
        .insert({
          id: diaryEntry.id,
          pair_id: updatedPair.id,
          user_id: user,
          text: text
        });

      console.log('✅ [diary] Updated');
      io.to(pairSockets[socket.id]).emit('diary-updated', updatedPair);
    } catch (error) {
      console.error('❌ [diary] Error:', error);
      socket.emit('error', { event: 'add-diary', message: error.message });
    }
  });

  // ✅ КНОПКА МИР
  socket.on('peace-request', async ({ code, user }) => {
    console.log('📥 [peace] Received:', { code, user });
    try {
      const {  pair, error: fetchError } = await supabase
        .from('pairs')
        .select('*')
        .eq('code', code)
        .single();

      if (fetchError) throw fetchError;

      const peaceData = {
        active: true,
        from: user,
        timestamp: new Date().toISOString()
      };

      const {  updatedPair, error: updateError } = await supabase
        .from('pairs')
        .update({ 
          peace: peaceData,
          updated_at: new Date().toISOString()
        })
        .eq('code', code)
        .select('*')
        .single();

      if (updateError) throw updateError;

      await supabase
        .from('peace')
        .insert({
          id: Date.now().toString(),
          pair_id: updatedPair.id,
          from_user: user,
          active: true
        });

      console.log('✅ [peace] Updated');
      io.to(pairSockets[socket.id]).emit('peace-updated', updatedPair);
    } catch (error) {
      console.error('❌ [peace] Error:', error);
      socket.emit('error', { event: 'peace-request', message: error.message });
    }
  });

  // ✅ ВИКТОРИНА
  socket.on('quiz-submit', async ({ code, user, ans }) => {
    console.log('📥 [quiz] Received:', { code, user, ans });
    try {
      const {  pair, error: fetchError } = await supabase
        .from('pairs')
        .select('*')
        .eq('code', code)
        .single();

      if (fetchError) throw fetchError;

      const quizField = user === 'M' ? 'ans_a' : 'ans_b';
      const currentQuiz = pair.quiz || {};
      const updatedQuiz = { 
        ...currentQuiz, 
        [quizField]: ans,
        question: currentQuiz.question || 'Today\'s Question'
      };
      
      const bothAnswered = updatedQuiz.ans_a && updatedQuiz.ans_b;
      
      const {  updatedPair, error: updateError } = await supabase
        .from('pairs')
        .update({ 
          quiz: { 
            ...updatedQuiz, 
            revealed: bothAnswered 
          },
          updated_at: new Date().toISOString()
        })
        .eq('code', code)
        .select('*')
        .single();

      if (updateError) throw updateError;

      if (bothAnswered) {
        await supabase
          .from('quiz')
          .insert({
            id: Date.now().toString(),
            pair_id: updatedPair.id,
            question: updatedQuiz.question,
            ans_a: updatedQuiz.ans_a,
            ans_b: updatedQuiz.ans_b,
            revealed: true
          });
      }

      console.log('✅ [quiz] Updated, both answered:', bothAnswered);
      io.to(pairSockets[socket.id]).emit('quiz-updated', updatedPair);
    } catch (error) {
      console.error('❌ [quiz] Error:', error);
      socket.emit('error', { event: 'quiz-submit', message: error.message });
    }
  });

  socket.on('disconnect', () => {
    const pairId = pairSockets[socket.id];
    if (pairId) {
      socket.leave(pairId);
      delete pairSockets[socket.id];
      console.log(`🔌 Socket ${socket.id} disconnected from pair ${pairId}`);
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    supabase: SUPABASE_URL ? 'configured' : 'missing'
  });
});

app.post('/api/pair/create', async (req, res) => {
  console.log('📥 [API] POST /api/pair/create');
  try {
    const code = 'FEEL-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    
    const { data, error } = await supabase
      .from('pairs')
      .insert({
        id: Date.now().toString(),
        code: code,
        streak: 0,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    console.log('✅ [API] Pair created:', { code, pairId: data.id });
    res.json({ success: true, code, pairId: data.id });
  } catch (error) {
    console.error('❌ [API] Failed to create pair:', error);
    res.status(500).json({ error: 'Failed to create pair', details: error.message });
  }
});

app.post('/api/pair/join', async (req, res) => {
  console.log('📥 [API] POST /api/pair/join:', req.body);
  try {
    const { code, userId } = req.body;
    
    const {  pair, error: fetchError } = await supabase
      .from('pairs')
      .select('*')
      .eq('code', code)
      .single();

    if (fetchError) throw fetchError;
    if (!pair) {
      return res.status(404).json({ error: 'Pair not found' });
    }

    const userField = userId === 'M' ? 'user_a' : 'user_b';
    const {  updatedPair, error: updateError } = await supabase
      .from('pairs')
      .update({ 
        [userField]: userId || 'user', 
        updated_at: new Date().toISOString() 
      })
      .eq('code', code)
      .select('*')
      .single();

    if (updateError) throw updateError;

    console.log('✅ [API] Pair joined:', { code, pairId: pair.id });
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
  console.log('🗄️ Supabase:', SUPABASE_URL ? '✓ Connected' : '✗ Not configured');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});