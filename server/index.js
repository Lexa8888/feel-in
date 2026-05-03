require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000
});

// ✅ CONFIG с вашими данными
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://lslsvzpraiobchxvncdo.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_r8KH-Zuqv-j5mS4DDjDQZw_RtG81TcK';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials!');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false }
});

const pairRooms = new Map();

io.on('connection', (socket) => {
  console.log('✅ Client connected:', socket.id);

  socket.on('join-pair', async ({ pairCode, userRole }) => {
    if (!pairCode || !userRole) return;
    
    const room = pairCode.toUpperCase().replace('FEEL-', '');
    
    socket.rooms.forEach(r => { if (r !== socket.id) socket.leave(r); });
    socket.join(room);
    pairRooms.set(socket.id, room);
    
    console.log(`🔗 ${socket.id} joined room ${room} as ${userRole}`);
    io.to(room).emit('partner-connected', { userRole });
    
    try {
      const { data: pair } = await supabase
        .from('pairs')
        .select('*')
        .eq('code', room)
        .single();
      
      if (pair) {
        socket.emit('status-updated', { 
          statusA: pair.status_a, 
          statusB: pair.status_b,
          userRole: pair.gender_a
        });
        socket.emit('quiz-updated', { quiz: pair.quiz });
        socket.emit('sleep-updated', { sleeping: pair.sleep_mode, userRole: pair.gender_a });
        socket.emit('peace-updated', { active: pair.peace_active });
      }
    } catch (e) { console.error('Pair fetch error:', e); }
  });

  socket.on('send-message', async ({ pairCode, userId, text, tempId }) => {
    if (!pairCode || !userId || !text) return;
    
    const room = pairCode.toUpperCase().replace('FEEL-', '');
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([{
          pair_code: room,
          user_id: userId,
          text: text.trim(),
          read_by_partner: false,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      socket.to(room).emit('new-message', data);
      socket.emit('message-sent', { tempId, realId: data.id });
      
    } catch (e) {
      console.error('Message save error:', e);
      socket.emit('message-error', { tempId, error: e.message });
    }
  });

  socket.on('load-messages', async ({ pairCode }) => {
    if (!pairCode) return;
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('pair_code', pairCode.toUpperCase().replace('FEEL-', ''))
        .order('created_at', { ascending: true })
        .limit(100);
      
      if (error) throw error;
      socket.emit('messages-loaded', { messages: data || [] });
    } catch (e) { console.error('Load messages error:', e); }
  });

  socket.on('update-status', async ({ pairCode, userId, mood, statusField }) => {
    if (!pairCode || !userId || !mood) return;
    
    const room = pairCode.toUpperCase().replace('FEEL-', '');
    const field = statusField;
    
    try {
      const { error } = await supabase
        .from('pairs')
        .update({ [field]: mood, updated_at: new Date().toISOString() })
        .eq('code', room);
      
      if (error) throw error;
      
      io.to(room).emit('status-updated', { 
        [field]: mood, 
        userRole: userId,
        mood 
      });
      
    } catch (e) { console.error('Status update error:', e); }
  });

  socket.on('quiz-submit', async ({ pairCode, userId, answer, answerField }) => {
    if (!pairCode || !userId || !answer) return;
    
    const room = pairCode.toUpperCase().replace('FEEL-', '');
    
    try {
      const { data: pair } = await supabase
        .from('pairs')
        .select('quiz')
        .eq('code', room)
        .single();
      
      const currentQuiz = pair?.quiz || {};
      const updatedQuiz = {
        ...currentQuiz,
        [answerField]: answer,
        revealed: !!(answerField === 'ans_a' ? currentQuiz.ans_b : currentQuiz.ans_a)
      };
      
      const { error } = await supabase
        .from('pairs')
        .update({ quiz: updatedQuiz, updated_at: new Date().toISOString() })
        .eq('code', room);
      
      if (error) throw error;
      
      io.to(room).emit('quiz-updated', { 
        quiz: updatedQuiz,
        userRole: userId 
      });
      
    } catch (e) { console.error('Quiz update error:', e); }
  });

  socket.on('sleep-toggle', async ({ pairCode, userId, sleeping }) => {
    if (!pairCode) return;
    
    const room = pairCode.toUpperCase().replace('FEEL-', '');
    
    try {
      const { error } = await supabase
        .from('pairs')
        .update({ sleep_mode: sleeping, updated_at: new Date().toISOString() })
        .eq('code', room);
      
      if (error) throw error;
      
      io.to(room).emit('sleep-updated', { 
        sleeping, 
        userRole: userId 
      });
      
    } catch (e) { console.error('Sleep toggle error:', e); }
  });

  socket.on('peace-request', async ({ pairCode, fromUser }) => {
    if (!pairCode) return;
    const room = pairCode.toUpperCase().replace('FEEL-', '');
    
    try {
      const { error } = await supabase
        .from('pairs')
        .update({ peace_active: true, updated_at: new Date().toISOString() })
        .eq('code', room);
      
      if (error) throw error;
      io.to(room).emit('peace-updated', { active: true, fromUser });
    } catch (e) { console.error('Peace error:', e); }
  });

  socket.on('typing-start', ({ pairCode }) => {
    if (pairCode) socket.to(pairCode.toUpperCase().replace('FEEL-', '')).emit('partner-typing');
  });
  socket.on('typing-stop', ({ pairCode }) => {
    if (pairCode) socket.to(pairCode.toUpperCase().replace('FEEL-', '')).emit('partner-stopped-typing');
  });

  socket.on('disconnect', () => {
    const room = pairRooms.get(socket.id);
    if (room) {
      io.to(room).emit('partner-disconnected');
      pairRooms.delete(socket.id);
    }
    console.log('❌ Client disconnected:', socket.id);
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    supabase: 'configured',
    credentials: {
      url: SUPABASE_URL,
      key: SUPABASE_ANON_KEY ? '***' : 'missing'
    }
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Server running on port', PORT);
  console.log('📊 Supabase URL:', SUPABASE_URL);
  console.log('🔑 Supabase Key:', SUPABASE_ANON_KEY ? '***configured***' : 'MISSING!');
});

process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});