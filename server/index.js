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

// 🔑 Supabase client
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

  socket.on('update-status', async ({ code, user, value }) => {
    console.log('📥 [status] Received:', { code, user, value });
    try {
      const { data: pair, error: fetchError } = await supabase
        .from('pairs')
        .select('*')
        .eq('code', code)
        .single();

      if (fetchError) {
        console.error('❌ [status] Fetch error:', fetchError);
        throw fetchError;
      }

      const updateField = user === 'M' ? 'status_a' : 'status_b';
      const { data: updatedPair, error: updateError } = await supabase
        .from('pairs')
        .update({ [updateField]: value, updated_at: new Date().toISOString() })
        .eq('code', code)
        .select()
        .single();

      if (updateError) {
        console.error('❌ [status] Update error:', updateError);
        throw updateError;
      }

      console.log('✅ [status] Updated successfully');
      io.to(pairSockets[socket.id]).emit('status-updated', updatedPair);
    } catch (error) {
      console.error('❌ [status] Error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      socket.emit('error', { event: 'update-status', message: error.message });
    }
  });

  socket.on('complete-ritual', async ({ code, user, text }) => {
    console.log('📥 [ritual] Received:', { code, user, text: text?.slice(0, 50) });
    try {
      const { data: pair, error: fetchError } = await supabase
        .from('pairs')
        .select('*')
        .eq('code', code)
        .single();

      if (fetchError) throw fetchError;

      const ritualField = user === 'M' ? 'ritual_a' : 'ritual_b';
      const { data: updatedPair, error: updateError } = await supabase
        .from('pairs')
        .update({ 
          [ritualField]: text,
          last_ritual: new Date().toISOString().split('T')[0],
          streak: (pair.streak || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('code', code)
        .select()
        .single();

      if (updateError) throw updateError;

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

      console.log('✅ [ritual] Updated successfully');
      io.to(pairSockets[socket.id]).emit('ritual-updated', updatedPair);
    } catch (error) {
      console.error('❌ [ritual] Error:', {
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      socket.emit('error', { event: 'complete-ritual', message: error.message });
    }
  });

  socket.on('add-diary', async ({ code, user, text }) => {
    console.log('📥 [diary] Received:', { code, user, text: text?.slice(0, 50) });
    try {
      const { data: pair, error: fetchError } = await supabase
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

      const { data: updatedPair, error: updateError } = await supabase
        .from('pairs')
        .update({ diary: updatedDiary, updated_at: new Date().toISOString() })
        .eq('code', code)
        .select()
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

      console.log('✅ [diary] Updated successfully');
      io.to(pairSockets[socket.id]).emit('diary-updated', updatedPair);
    } catch (error) {
      console.error('❌ [diary] Error:', {
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      socket.emit('error', { event: 'add-diary', message: error.message });
    }
  });

  socket.on('peace-request', async ({ code, user }) => {
    console.log('📥 [peace] Received:', { code, user });
    try {
      const { data: pair, error: fetchError } = await supabase
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

      const { data: updatedPair, error: updateError } = await supabase
        .from('pairs')
        .update({ peace: peaceData, updated_at: new Date().toISOString() })
        .eq('code', code)
        .select()
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

      console.log('✅ [peace] Updated successfully');
      io.to(pairSockets[socket.id]).emit('peace-updated', updatedPair);
    } catch (error) {
      console.error('❌ [peace] Error:', {
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      socket.emit('error', { event: 'peace-request', message: error.message });
    }
  });

  socket.on('quiz-submit', async ({ code, user, ans }) => {
    console.log('📥 [quiz] Received:', { code, user, ans });
    try {
      const { data: pair, error: fetchError } = await supabase
        .from('pairs')
        .select('*')
        .eq('code', code)
        .single();

      if (fetchError) throw fetchError;

      const quizField = user === 'M' ? 'ans_a' : 'ans_b';
      const currentQuiz = pair.quiz || {};
      const updatedQuiz = { ...currentQuiz, [quizField]: ans };
      const bothAnswered = updatedQuiz.ans_a && updatedQuiz.ans_b;
      
      const { data: updatedPair, error: updateError } = await supabase
        .from('pairs')
        .update({ 
          quiz: { ...updatedQuiz, revealed: bothAnswered },
          updated_at: new Date().toISOString()
        })
        .eq('code', code)
        .select()
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

      console.log('✅ [quiz] Updated successfully');
      io.to(pairSockets[socket.id]).emit('quiz-updated', updatedPair);
    } catch (error) {
      console.error('❌ [quiz] Error:', {
        message: error.message,
        details: error.details,
        hint: error.hint
      });
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

// REST API
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    supabase: SUPABASE_URL ? 'configured' : 'missing'
  });
});

app.post('/api/pair/create', async (req, res) => {
  console.log('📥 [API] POST /api/pair/create');
  console.log('🔑 Using Supabase URL:', SUPABASE_URL);
  
  try {
    const code = 'FEEL-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    
    console.log('📝 Inserting into pairs:', { code, id: Date.now().toString() });
    
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

    if (error) {
      console.error('❌ [API] Supabase insert error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }

    console.log('✅ [API] Pair created successfully:', { code, pairId: data.id });
    res.json({ success: true, code, pairId: data.id });
  } catch (error) {
    console.error('❌ [API] Failed to create pair:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    });
    res.status(500).json({ 
      error: 'Failed to create pair', 
      details: error.message,
      hint: error.hint 
    });
  }
});

app.post('/api/pair/join', async (req, res) => {
  console.log('📥 [API] POST /api/pair/join:', req.body);
  try {
    const { code, userId } = req.body;
    
    const { data: pair, error: fetchError } = await supabase
      .from('pairs')
      .select('*')
      .eq('code', code)
      .single();

    if (fetchError) throw fetchError;
    if (!pair) {
      return res.status(404).json({ error: 'Pair not found' });
    }

    const userField = userId === 'M' ? 'user_a' : 'user_b';
    const { data: updatedPair, error: updateError } = await supabase
      .from('pairs')
      .update({ [userField]: userId || 'user', updated_at: new Date().toISOString() })
      .eq('code', code)
      .select()
      .single();

    if (updateError) throw updateError;

    console.log('✅ [API] Pair joined:', { code, pairId: pair.id });
    res.json({ success: true, pair: updatedPair, pairId: pair.id });
  } catch (error) {
    console.error('❌ [API] Failed to join pair:', {
      message: error.message,
      details: error.details,
      hint: error.hint
    });
    res.status(500).json({ 
      error: 'Failed to join pair', 
      details: error.message,
      hint: error.hint 
    });
  }
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Server running on port', PORT);
  console.log('📡 Socket.IO ready');
  console.log('🗄️ Supabase:', SUPABASE_URL ? '✓ Connected' : '✗ Not configured');
  console.log('🌍 Environment:', process.env.NODE_ENV || 'development');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});