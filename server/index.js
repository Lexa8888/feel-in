require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

// 🔌 Socket.io
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000
});

// 🗄 Supabase Config (с твоими ключами из App.js)
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://lslsvzpraiobchxvncdo.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_r8KH-Zuqv-j5mS4DDjDQZw_RtG81TcK';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ ERROR: Missing Supabase credentials!');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false }
});

const pairSockets = {};

io.on('connection', (socket) => {
  console.log('✅ Client connected:', socket.id);

  // 🔥 JOIN ROOM
  socket.on('join-pair', async ({ pairCode, userRole }) => {
    if (!pairCode || !userRole) return;
    
    // Clean code
    const code = pairCode.toUpperCase().replace('FEEL-', '');
    
    socket.rooms.forEach(r => { if (r !== socket.id) socket.leave(r); });
    socket.join(code);
    pairSockets[socket.id] = code;
    
    console.log(`🔗 ${socket.id} joined ${code} as ${userRole}`);
    
    // Load initial state
    try {
      const {  pair } = await supabase
        .from('pairs')
        .select('*')
        .eq('code', code)
        .single();
      
      if (pair) {
        socket.emit('init-data', {
          statusA: pair.status_a,
          statusB: pair.status_b,
          quiz: pair.quiz || { ans_a: null, ans_b: null, revealed: false },
          sleep_mode: pair.sleep_mode,
          gender_a: pair.gender_a
        });
        
        // Broadcast to partner that someone joined
        socket.to(code).emit('partner-connected', { userRole });
      }
    } catch (e) { console.error('Init load error:', e); }
  });

  // 💬 MESSAGES
  socket.on('send-message', async ({ pairCode, userId, text, tempId }) => {
    const code = pairCode.toUpperCase().replace('FEEL-', '');
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([{
          pair_code: code,
          user_id: userId,
          text: text.trim(),
          read_by_partner: false,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      // Send to everyone ELSE in the room
      socket.to(code).emit('new-message', data);
      socket.emit('message-sent', { tempId, realId: data.id });
      
    } catch (e) {
      console.error('Msg error:', e);
    }
  });

  socket.on('load-messages', async ({ pairCode }) => {
    const code = pairCode.toUpperCase().replace('FEEL-', '');
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('pair_code', code)
        .order('created_at', { ascending: true })
        .limit(50);
      
      if (!error) socket.emit('messages-loaded', data);
    } catch (e) { console.error(e); }
  });

  // 💓 MOOD
  socket.on('update-status', async ({ pairCode, userId, mood }) => {
    const code = pairCode.toUpperCase().replace('FEEL-', '');
    const field = userId === 'M' ? 'status_a' : 'status_b';
    
    try {
      await supabase.from('pairs').update({ [field]: mood }).eq('code', code);
      io.to(code).emit('status-updated', { userId, mood, field });
    } catch (e) { console.error(e); }
  });

  //  QUIZ
  socket.on('quiz-submit', async ({ pairCode, userId, answer }) => {
    const code = pairCode.toUpperCase().replace('FEEL-', '');
    const field = userId === 'M' ? 'ans_a' : 'ans_b';
    
    try {
      const {  pair } = await supabase.from('pairs').select('quiz').eq('code', code).single();
      const currentQuiz = pair?.quiz || {};
      
      const updatedQuiz = {
        ...currentQuiz,
        [field]: answer,
        revealed: !!(currentQuiz.ans_a && currentQuiz.ans_b)
      };

      await supabase.from('pairs').update({ quiz: updatedQuiz }).eq('code', code);
      io.to(code).emit('quiz-updated', updatedQuiz);
    } catch (e) { console.error(e); }
  });

  //  SLEEP
  socket.on('sleep-toggle', async ({ pairCode, userId, active }) => {
    const code = pairCode.toUpperCase().replace('FEEL-', '');
    try {
      await supabase.from('pairs').update({ sleep_mode: active }).eq('code', code);
      io.to(code).emit('sleep-updated', { active, userId });
    } catch (e) { console.error(e); }
  });

  //  DISCONNECT
  socket.on('disconnect', () => {
    const code = pairSockets[socket.id];
    if (code) delete pairSockets[socket.id];
  });
});

//  HEALTH CHECK
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    supabase_configured: !!SUPABASE_URL
  });
});

// 🚀 START
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});