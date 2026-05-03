require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }));
app.use(express.json({ limit: '50mb' }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'poll']
});

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jgpcuebyysxkrdqkvqmz.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_xQWX7_juECMQlPzwW-cb9w_CLszetYD';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

io.on('connection', (socket) => {
  console.log('🔌 Connected:', socket.id);

  socket.on('join-pair', async ({ pairCode, userRole }) => {
    try {
      console.log(`👥 ${socket.id} joining ${pairCode} as ${userRole}`);
      socket.join(pairCode);
      socket.emit('joined', { success: true, code: pairCode });

      const { data } = await supabase.from('pairs').select('status_a, status_b').eq('code', pairCode).single();
      if (data) {
        socket.emit('init-status', { statusA: data.status_a, statusB: data.status_b });
      }
    } catch (err) {
      console.error('❌ join-pair error:', err.message);
    }
  });

  socket.on('load-messages', async ({ pairCode }) => {
    try {
      console.log('📚 Loading messages for:', pairCode);
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('pair_code', pairCode)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) {
        console.error('❌ Error loading messages:', error);
        socket.emit('messages-loaded', []);
      } else {
        console.log('✅ Loaded', data?.length, 'messages');
        socket.emit('messages-loaded', data || []);
      }
    } catch (err) {
      console.error('❌ load-messages error:', err.message);
      socket.emit('messages-loaded', []);
    }
  });

  socket.on('send-message', async (msg) => {
    try {
      console.log('💬 Sending message:', msg.id, msg.type);
      const { data, error } = await supabase.from('messages').insert(msg).select();

      if (error) {
        console.error('❌ Error saving message:', error);
      } else {
        console.log('✅ Message saved:', data);
        io.to(msg.pair_code).emit('new-message', msg);
      }
    } catch (err) {
      console.error('❌ send-message error:', err.message);
    }
  });

  socket.on('mark-read', async ({ pairCode, messageId, reader }) => {
    try {
      console.log('📖 Message read:', messageId, 'by', reader);
      await supabase
        .from('messages')
        .update({ read_by_partner: true, updated_at: new Date().toISOString() })
        .eq('id', messageId)
        .neq('user_id', reader);

      socket.to(pairCode).emit('message-read', { messageId, reader });
    } catch (err) {
      console.error('❌ mark-read error:', err.message);
    }
  });

  // 🔑 FIX: io.to sends to ALL in room (including sender), ensuring sync
  socket.on('update-status', async ({ code, user, value }) => {
    try {
      console.log('💓 Status update:', user, value, 'for pair', code);
      const field = user === 'M' ? 'status_a' : 'status_b';

      const { error } = await supabase
        .from('pairs')
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq('code', code);

      if (error) {
        console.error('❌ Error updating status:', error);
      } else {
        console.log('✅ Status updated in DB, broadcasting to ALL in room:', code);
        io.to(code).emit('status-updated', { user, value });
      }
    } catch (err) {
      console.error('❌ update-status error:', err.message);
    }
  });

  socket.on('get-profiles', async ({ pairCode }) => {
    try {
      const { data } = await supabase.from('profiles').select('*').eq('pair_code', pairCode);
      if (data) socket.emit('profiles-loaded', data);
    } catch (err) { console.error('❌ get-profiles error:', err.message); }
  });

  socket.on('update-profile', async ({ pairCode, user, nickname, avatarColor }) => {
    try {
      await supabase.from('profiles').upsert({
        pair_code: pairCode,
        user_id: user,
        nickname: nickname || user,
        avatar_color: avatarColor || '#ff6b9d',
        updated_at: new Date().toISOString()
      }).eq('pair_code', pairCode).eq('user_id', user);

      io.to(pairCode).emit('profile-updated', { user, nickname: nickname || user, avatarColor: avatarColor || '#ff6b9d' });
    } catch (err) { console.error('❌ update-profile error:', err.message); }
  });

  socket.on('quiz-submit', async ({ pairCode, user, ans }) => {
    try {
      const {  pair } = await supabase.from('pairs').select('quiz').eq('code', pairCode).single();
      const field = user === 'M' ? 'ans_a' : 'ans_b';
      const quiz = { ...(pair?.quiz || {}), [field]: ans, question: pair?.quiz?.question || 'Daily' };
      const revealed = quiz.ans_a && quiz.ans_b;

      await supabase.from('pairs').update({ quiz: { ...quiz, revealed }, updated_at: new Date().toISOString() }).eq('code', pairCode);
      io.to(pairCode).emit('quiz-updated', { quiz });
    } catch (err) { console.error('❌ quiz-submit error:', err.message); }
  });

  socket.on('peace-request', async ({ pairCode, user }) => {
    try {
      const peace = { active: true, from: user, timestamp: new Date().toISOString() };
      await supabase.from('pairs').update({ peace, updated_at: new Date().toISOString() }).eq('code', pairCode);
      io.to(pairCode).emit('peace-updated', peace);
    } catch (err) { console.error('❌ peace-request error:', err.message); }
  });

  socket.on('sleep-toggle', async ({ pairCode, user, active, sleepUntil }) => {
    try {
      console.log('😴 Sleep toggle:', { pairCode, user, active, sleepUntil });
      await supabase.from('pairs').update({
        sleep_mode: active,
        sleep_until: sleepUntil || null,
        updated_at: new Date().toISOString()
      }).eq('code', pairCode);

      io.to(pairCode).emit('sleep-updated', { active, user, sleepUntil });
    } catch (err) {
      console.error('❌ sleep-toggle error:', err.message);
    }
  });

  socket.on('disconnect', () => {
    console.log('❌ Disconnected:', socket.id);
  });
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});