require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'poll']
});

// Supabase Init
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
      
      // Load initial statuses
      const { data } = await supabase.from('pairs').select('status_a, status_b').eq('code', pairCode).single();
      if (data) {
        // ✅ ИСПРАВЛЕНО: data.status_b вместо status_b
        socket.emit('init-status', { 
          statusA: data.status_a, 
          statusB: data.status_b 
        });
      }
    } catch (err) {
      console.error('❌ join-pair error:', err.message);
    }
  });

  socket.on('load-messages', async ({ pairCode }) => {
    try {
      const { data } = await supabase.from('messages').select('*').eq('pair_code', pairCode).order('created_at', { ascending: true }).limit(50);
      socket.emit('messages-loaded', data || []);
    } catch (err) { console.error('❌ load-messages error:', err.message); }
  });

  socket.on('send-message', async (msg) => {
    try {
      console.log('💬 Message:', msg.text);
      await supabase.from('messages').insert(msg);
      io.to(msg.pair_code).emit('new-message', msg);
    } catch (err) { console.error('❌ send-message error:', err.message); }
  });

  socket.on('update-status', async ({ code, user, value }) => {
    try {
      console.log('💓 Status:', user, value);
      const field = user === 'M' ? 'status_a' : 'status_b';
      await supabase.from('pairs').update({ [field]: value }).eq('code', code);
      io.to(code).emit('status-updated', { user, value });
    } catch (err) { console.error('❌ update-status error:', err.message); }
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