require('dotenv').config();
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

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://jgpcuebyysxkrdqkvqmz.supabase.co',
  process.env.SUPABASE_ANON_KEY || 'sb_publishable_xQWX7_juECMQlPzwW-cb9w_CLszetYD',
  { auth: { persistSession: false } }
);

const userPushTokens = {};
const pairSockets = {};
const typingUsers = {};

// Socket.IO
io.on('connection', (socket) => {
  console.log('🔌 Connected:', socket.id);

  socket.on('register-push-token', ({ user, token, pairCode }) => {
    if (!userPushTokens[pairCode]) userPushTokens[pairCode] = {};
    userPushTokens[pairCode][user] = token;
  });

  socket.on('join-pair', async (pairId) => {
    socket.join(pairId);
    pairSockets[socket.id] = pairId;
    
    try {
      const { data } = await supabase
        .from('pairs')
        .select('sleep_mode, sleep_until')
        .eq('code', pairId)
        .single();
      
      if (data) {
        socket.emit('sleep-updated', { 
          active: data.sleep_mode || false, 
          user: null, 
          sleepUntil: data.sleep_until 
        });
      }
    } catch(e) { 
      console.error('Sleep fetch err:', e); 
    }
  });

  socket.on('update-profile', async ({ pairCode, user, nickname, avatarColor }) => {
    try {
      await supabase
        .from('profiles')
        .upsert({
          pair_code: pairCode,
          user_id: user,
          nickname: nickname || user,
          avatar_color: avatarColor || '#4ECDC4',
          updated_at: new Date().toISOString()
        })
        .eq('pair_code', pairCode)
        .eq('user_id', user);
      
      io.to(pairCode).emit('profile-updated', { 
        user, 
        nickname: nickname || user, 
        avatarColor: avatarColor || '#4ECDC4' 
      });
    } catch (e) { 
      console.error('Profile err:', e); 
    }
  });

  socket.on('get-profiles', async ({ pairCode }) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('pair_code', pairCode);
      
      if (data) socket.emit('profiles-loaded', data);
    } catch (e) { 
      console.error('Get profiles err:', e); 
    }
  });

  socket.on('load-messages', async ({ pairCode }) => {
    try {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('pair_code', pairCode)
        .order('created_at', { ascending: true })
        .limit(50);
      
      if (data) socket.emit('messages-loaded', data);
    } catch (e) { 
      console.error('Load messages err:', e); 
    }
  });

  socket.on('send-message', async ({ code, user, text, timestamp, nickname }) => {
    try {
      const msg = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
        pair_code: code,
        user_id: user,
        nickname: nickname || user,
        text,
        read_by_partner: false,
        created_at: timestamp || new Date().toISOString()
      };

      await supabase.from('messages').insert(msg);
      io.to(code).emit('new-message', msg);
      socket.emit('message-sent', msg);
    } catch (e) { 
      console.error('Chat err:', e); 
    }
  });

  socket.on('mark-read', async ({ pairCode, messageId, reader }) => {
    try {
      await supabase
        .from('messages')
        .update({ 
          read_by_partner: true, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', messageId)
        .neq('user_id', reader);
      
      socket.to(pairCode).emit('message-read', { messageId, reader });
    } catch (e) { 
      console.error('Read err:', e); 
    }
  });

  socket.on('typing-start', ({ pairCode, user, nickname }) => {
    if (!typingUsers[pairCode]) typingUsers[pairCode] = {};
    if (typingUsers[pairCode][user]) clearTimeout(typingUsers[pairCode][user]);
    
    socket.to(pairCode).emit('partner-typing', { user, nickname: nickname || user });
    
    typingUsers[pairCode][user] = setTimeout(() => {
      socket.to(pairCode).emit('partner-stopped-typing', { user });
      delete typingUsers[pairCode]?.[user];
    }, 3000);
  });

  socket.on('typing-stop', ({ pairCode, user }) => {
    socket.to(pairCode).emit('partner-stopped-typing', { user });
    if (typingUsers[pairCode]?.[user]) {
      clearTimeout(typingUsers[pairCode][user]);
      delete typingUsers[pairCode][user];
    }
  });

  socket.on('update-status', async ({ code, user, value }) => {
    try {
      const field = user === 'M' ? 'status_a' : 'status_b';
      await supabase
        .from('pairs')
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq('code', code);
      
      io.to(code).emit('status-updated', { user, value });
    } catch (e) { 
      console.error('Status err:', e); 
    }
  });

  socket.on('load-mood-history', async ({ pairCode }) => {
    try {
      const { data } = await supabase
        .from('mood_history')
        .select('*')
        .eq('pair_code', pairCode)
        .order('created_at', { ascending: true })
        .limit(30);
      
      if (data) socket.emit('mood-history-loaded', data);
    } catch (e) { 
      console.error('Mood history err:', e); 
    }
  });

  socket.on('complete-ritual', async ({ code, user, text }) => {
    try {
      const { data: pair } = await supabase
        .from('pairs')
        .select('*')
        .eq('code', code)
        .single();
      
      const field = user === 'M' ? 'ritual_a' : 'ritual_b';
      const other = user === 'M' ? 'ritual_b' : 'ritual_a';
      const newStreak = pair?.[other] ? (pair.streak || 0) + 1 : (pair.streak || 0);

      await supabase
        .from('pairs')
        .update({ 
          [field]: text, 
          last_ritual: new Date().toISOString().split('T')[0], 
          streak: newStreak, 
          updated_at: new Date().toISOString() 
        })
        .eq('code', code);
      
      await supabase
        .from('rituals')
        .insert({ 
          id: Date.now().toString(), 
          pair_id: pair?.id, 
          user_id: user, 
          text, 
          completed_at: new Date().toISOString() 
        });
      
      io.to(pairSockets[socket.id]).emit('ritual-updated', { user, text });
    } catch (e) { 
      console.error('Ritual err:', e); 
    }
  });

  socket.on('add-diary', async ({ code, user, text }) => {
    try {
      const { data: pair } = await supabase
        .from('pairs')
        .select('diary')
        .eq('code', code)
        .single();
      
      const entry = { 
        id: Date.now().toString(), 
        by: user, 
        text, 
        createdAt: new Date().toISOString() 
      };
      
      const updated = [...(pair?.diary || []), entry];
      
      await supabase
        .from('pairs')
        .update({ 
          diary: updated, 
          updated_at: new Date().toISOString() 
        })
        .eq('code', code);
      
      await supabase
        .from('diary')
        .insert({ 
          id: entry.id, 
          pair_id: pair?.id, 
          user_id: user, 
          text 
        });
      
      io.to(pairSockets[socket.id]).emit('diary-updated', { diary: updated });
    } catch (e) { 
      console.error('Diary err:', e); 
    }
  });

  socket.on('peace-request', async ({ code, user }) => {
    try {
      const { data: pair } = await supabase
        .from('pairs')
        .select('*')
        .eq('code', code)
        .single();
      
      const peace = { 
        active: true, 
        from: user, 
        timestamp: new Date().toISOString() 
      };
      
      await supabase
        .from('pairs')
        .update({ peace, updated_at: new Date().toISOString() })
        .eq('code', code);
      
      await supabase
        .from('peace')
        .insert({ 
          id: Date.now().toString(), 
          pair_id: pair?.id, 
          from_user: user, 
          active: true 
        });
      
      io.to(pairSockets[socket.id]).emit('peace-updated', peace);
    } catch (e) { 
      console.error('Peace err:', e); 
    }
  });

  socket.on('quiz-submit', async ({ code, user, ans }) => {
    try {
      const { data: pair } = await supabase
        .from('pairs')
        .select('quiz')
        .eq('code', code)
        .single();
      
      const field = user === 'M' ? 'ans_a' : 'ans_b';
      const quiz = { 
        ...(pair?.quiz || {}), 
        [field]: ans, 
        question: pair?.quiz?.question || 'Daily' 
      };
      
      const revealed = quiz.ans_a && quiz.ans_b;
      
      await supabase
        .from('pairs')
        .update({ 
          quiz: { ...quiz, revealed }, 
          updated_at: new Date().toISOString() 
        })
        .eq('code', code);
      
      if (revealed) {
        await supabase
          .from('quiz')
          .insert({ 
            id: Date.now().toString(), 
            pair_id: pair?.id, 
            ...quiz, 
            revealed: true 
          });
      }
      
      io.to(pairSockets[socket.id]).emit('quiz-updated', { quiz });
    } catch (e) { 
      console.error('Quiz err:', e); 
    }
  });

  socket.on('streak-sync', async ({ code, streak }) => {
    try {
      await supabase
        .from('pairs')
        .update({ streak, updated_at: new Date().toISOString() })
        .eq('code', code);
      
      io.to(code).emit('streak-updated', { streak });
    } catch (e) { 
      console.error('Streak err:', e); 
    }
  });

  socket.on('sleep-toggle', async ({ pairCode, user, active }) => {
    try {
      const sleepUntil = active 
        ? new Date(Date.now() + 8 * 3600000).toISOString() 
        : null;
      
      await supabase
        .from('pairs')
        .update({ 
          sleep_mode: active, 
          sleep_until: sleepUntil, 
          updated_at: new Date().toISOString() 
        })
        .eq('code', pairCode);
      
      io.to(pairCode).emit('sleep-updated', { active, user, sleepUntil });
    } catch (e) { 
      console.error('Sleep toggle err:', e); 
    }
  });

  socket.on('disconnect', () => {
    const pid = pairSockets[socket.id];
    if (pid) {
      socket.leave(pid);
      delete pairSockets[socket.id];
      
      if (typingUsers[pid]) {
        Object.values(typingUsers[pid]).forEach(clearTimeout);
        delete typingUsers[pid];
      }
    }
  });
});

// API Endpoints
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    supabase_configured: !!supabase 
  });
});

app.post('/api/pair/create', async (req, res) => {
  try {
    let code, data, error, att = 0;
    
    do {
      code = 'FEEL-' + Math.random().toString(36).substring(2, 6).toUpperCase();
      const r = await supabase
        .from('pairs')
        .insert({ 
          id: Date.now().toString(), 
          code, 
          streak: 0 
        })
        .select()
        .single();
      
      data = r.data; 
      error = r.error; 
      att++;
    } while (error?.code === '23505' && att < 5);
    
    if (error) throw error;
    
    res.json({ success: true, code, pairId: data.id });
  } catch (e) { 
    res.status(500).json({ error: e.message }); 
  }
});

app.post('/api/pair/join', async (req, res) => {
  try {
    const { code } = req.body;
    
    const { data: pair, error } = await supabase
      .from('pairs')
      .select('*')
      .eq('code', code.toUpperCase())
      .single();
    
    if (error || !pair) {
      return res.status(404).json({ error: 'Not found' });
    }
    
    res.json({ success: true, pair, pairId: pair.id });
  } catch (e) { 
    res.status(500).json({ error: e.message }); 
  }
});

// Start server
const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

process.on('unhandledRejection', (r) => console.error('❌ Unhandled:', r));
process.on('uncaughtException', (e) => { 
  console.error('❌ Exception:', e); 
  process.exit(1); 
});