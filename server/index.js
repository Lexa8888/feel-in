require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { createClient } = require('@supabase/supabase-js');
const http = require('http');
const socketIo = require('socket.io');
const { Expo } = require('expo-server-sdk');
const rateLimit = require('express-rate-limit');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { 
  cors: { 
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], 
    credentials: true 
  } 
});

app.use(helmet());
app.use(cors({ 
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], 
  credentials: true 
}));

const limiter = rateLimit({ 
  windowMs: 15 * 60 * 1000, 
  max: 100, 
  message: { error: 'Too many requests' } 
});
app.use('/api/', limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials!');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { 
  auth: { persistSession: false } 
});

const expo = new Expo();
const userPushTokens = {};
const pairSockets = {};
const typingUsers = {};

console.log('✅ Server starting...');
console.log('📊 Supabase URL:', SUPABASE_URL);

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const { data, error } = await supabase.from('pairs').select('count').limit(1);
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      supabase: error ? 'error: ' + error.message : 'configured',
      pairsCount: data?.length || 0
    });
  } catch (e) {
    res.json({ status: 'error', message: e.message });
  }
});

// Создание пары
app.post('/api/pair/create', async (req, res) => {
  console.log('📝 Creating new pair...');
  try {
    let code, result, error, attempts = 0;
    
    do {
      code = 'FEEL-' + Math.random().toString(36).substring(2, 6).toUpperCase();
      console.log(`🎲 Trying code: ${code}`);
      
      result = await supabase
        .from('pairs')
        .insert([{ 
          id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
          code: code,
          streak: 0,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();
      
      error = result.error;
      attempts++;
      
      if (error && error.code === '23505') {
        console.log(`⚠️ Code ${code} already exists, trying again...`);
      }
    } while (error && error.code === '23505' && attempts < 10);
    
    if (error) throw error;
    
    console.log(`✅ Pair created: ${code}`);
    res.json({ 
      success: true, 
      code: code,
      pairId: result.data.id 
    });
  } catch (e) {
    console.error('❌ Create pair error:', e);
    res.status(500).json({ 
      success: false,
      error: e.message 
    });
  }
});

// Вход в пару
app.post('/api/pair/join', async (req, res) => {
  console.log('🔑 Join pair request:', req.body);
  try {
    let { code } = req.body;
    
    if (!code) {
      console.log('❌ No code provided');
      return res.status(400).json({ error: 'Code is required' });
    }
    
    code = code.trim().toUpperCase();
    
    if (!code.startsWith('FEEL-')) {
      code = 'FEEL-' + code.replace('FEEL-', '');
    }
    
    console.log(`🔍 Searching for pair with code: ${code}`);
    
    const { data: pair, error } = await supabase
      .from('pairs')
      .select('*')
      .eq('code', code)
      .single();
    
    if (error) {
      console.error('❌ Database error:', error);
      return res.status(404).json({ 
        error: 'Pair not found',
        details: error.message 
      });
    }
    
    if (!pair) {
      console.log(`❌ Pair ${code} not found in database`);
      return res.status(404).json({ 
        error: 'Pair not found',
        searchedCode: code 
      });
    }
    
    console.log(`✅ Pair found: ${code}`, pair.id);
    res.json({ 
      success: true, 
      pair: pair,
      pairId: pair.id 
    });
  } catch (e) {
    console.error('❌ Join pair error:', e);
    res.status(500).json({ 
      error: e.message,
      stack: process.env.NODE_ENV === 'development' ? e.stack : undefined
    });
  }
});

// Удаление аккаунта
app.post('/api/user/delete', async (req, res) => {
  try {
    const { pairCode } = req.body;
    if (!pairCode) return res.status(400).json({ error: 'Missing pairCode' });
    
    await supabase.from('messages').delete().eq('pair_code', pairCode);
    await supabase.from('mood_history').delete().eq('pair_code', pairCode);
    await supabase.from('profiles').delete().eq('pair_code', pairCode);
    
    const { data: pairData } = await supabase.from('pairs').select('id').eq('code', pairCode).single();
    if (pairData) {
      await supabase.from('rituals').delete().eq('pair_id', pairData.id);
      await supabase.from('diary').delete().eq('pair_id', pairData.id);
      await supabase.from('peace').delete().eq('pair_id', pairData.id);
      await supabase.from('quiz').delete().eq('pair_id', pairData.id);
    }
    
    await supabase.from('pairs').delete().eq('code', pairCode);
    res.json({ success: true });
  } catch (e) {
    console.error('❌ Delete error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Загрузка медиа
app.post('/api/upload-media', async (req, res) => {
  try {
    const { fileBase64, fileName, mimeType } = req.body;
    if (!fileBase64 || !fileName) return res.status(400).json({ error: 'Missing file data' });
    
    const buffer = Buffer.from(fileBase64, 'base64');
    const filePath = `media/${Date.now()}_${fileName}`;
    
    const { data, error } = await supabase.storage.from('feel-in-media').upload(filePath, buffer, { 
      contentType: mimeType, 
      upsert: true 
    });
    
    if (error) throw error;
    
    const { data: urlData } = supabase.storage.from('feel-in-media').getPublicUrl(filePath);
    res.json({ success: true, url: urlData.publicUrl, path: filePath });
  } catch (e) {
    console.error('❌ Upload error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Socket.IO connections
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);
  
  socket.on('join-pair', async (pairCode) => {
    console.log(`👥 Socket ${socket.id} joining pair: ${pairCode}`);
    socket.join(pairCode);
    pairSockets[socket.id] = pairCode;
    
    try {
      const { data } = await supabase
        .from('pairs')
        .select('sleep_mode, sleep_until')
        .eq('code', pairCode)
        .single();
      
      if (data) {
        socket.emit('sleep-updated', { 
          active: data.sleep_mode, 
          sleepUntil: data.sleep_until, 
          user: data.sleep_mode ? 'system' : null 
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
  
  socket.on('send-message', async ({ code, user, text, timestamp, nickname, mediaUrl, mediaType }) => { 
    try { 
      const msg = { 
        id: Date.now().toString() + Math.random().toString(36).substring(2, 6), 
        pair_code: code, 
        user_id: user, 
        nickname: nickname || user, 
        text: text || '', 
        media_url: mediaUrl || null, 
        media_type: mediaType || null, 
        read_by_partner: false, 
        created_at: timestamp || new Date().toISOString() 
      }; 
      
      await supabase.from('messages').insert(msg); 
      socket.to(code).emit('new-message', msg); 
      socket.emit('message-sent', msg); 
      
      const partner = user === 'M' ? 'Ж' : 'M'; 
      const token = userPushTokens[code]?.[partner]; 
      
      if (token && Expo.isExpoPushToken(token)) { 
        expo.sendPushNotificationsAsync([{ 
          to: token, 
          sound: 'default', 
          title: `💬 ${msg.nickname}`, 
          body: mediaType ? `📎 Вложение` : (msg.text.length > 40 ? msg.text.substring(0, 40) + '...' : msg.text), 
          data: { code, type: 'message' } 
        }]).catch(e => console.error('Push err:', e)); 
      } 
    } catch (e) { 
      console.error('Chat err:', e); 
    } 
  });
  
  socket.on('mark-read', async ({ pairCode, messageId, reader }) => { 
    try { 
      await supabase
        .from('messages')
        .update({ read_by_partner: true, updated_at: new Date().toISOString() })
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
  
  // ✅ ОБНОВЛЕННЫЙ ОБРАБОТЧИК СТАТУСОВ (РЕАЛЬНОЕ ВРЕМЯ)
  socket.on('update-status', async ({ code, user, value }) => {
    console.log(`🔄 Status update received: User ${user}, Value: ${value}, Pair: ${code}`);
    try {
      const field = user === 'M' ? 'status_a' : 'status_b';
      
      await supabase
        .from('pairs')
        .update({ 
          [field]: value, 
          updated_at: new Date().toISOString() 
        })
        .eq('code', code);
      
      await supabase
        .from('mood_history')
        .insert({ 
          pair_code: code, 
          user_id: user, 
          mood: value 
        });
      
      // Рассылаем ВСЕМ в комнате пары
      io.to(code).emit('status-updated', { user, value });
      console.log(`📢 Broadcasted status update to room: ${code}`);
    } catch (e) {
      console.error('❌ Status update error:', e);
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
  
  socket.on('peace-request', async ({ code, user }) => { 
    try { 
      const { data: pair } = await supabase
        .from('pairs')
        .select('*')
        .eq('code', code)
        .single();
      
      const peace = { active: true, from: user, timestamp: new Date().toISOString() }; 
      
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
      const quiz = { ...(pair?.quiz || {}), [field]: ans, question: pair?.quiz?.question || 'Daily' }; 
      const revealed = quiz.ans_a && quiz.ans_b; 
      
      await supabase
        .from('pairs')
        .update({ quiz: { ...quiz, revealed }, updated_at: new Date().toISOString() })
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
  
  socket.on('sleep-toggle', async ({ pairCode, user, active }) => { 
    try { 
      const sleepUntil = active ? new Date(Date.now() + 8 * 3600000).toISOString() : null; 
      
      await supabase
        .from('pairs')
        .update({ sleep_mode: active, sleep_until: sleepUntil, updated_at: new Date().toISOString() })
        .eq('code', pairCode);
      
      io.to(pairCode).emit('sleep-updated', { active, user, sleepUntil }); 
      
      const partner = user === 'M' ? 'Ж' : 'M'; 
      const token = userPushTokens[pairCode]?.[partner]; 
      
      if (token && Expo.isExpoPushToken(token)) { 
        expo.sendPushNotificationsAsync([{ 
          to: token, 
          sound: 'default', 
          title: active ? '🌙 Партнёр уснул' : '☀️ Партнёр проснулся', 
          body: active ? 'Сладких снов 💤' : 'Доброе утро 🌞', 
          data: { type: 'sleep', active, pairCode } 
        }]).catch(e => console.error('Push err:', e)); 
      } 
    } catch (e) { 
      console.error('Sleep toggle err:', e); 
    } 
  });
  
  socket.on('haptic-pulse', async ({ pairCode, user }) => { 
    try { 
      io.to(pairCode).emit('receive-haptic-pulse', { from: user, timestamp: Date.now() }); 
    } catch (e) { 
      console.error('Haptic err:', e); 
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

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
});

process.on('unhandledRejection', (r) => console.error('❌ Unhandled:', r));
process.on('uncaughtException', (e) => { 
  console.error('❌ Exception:', e); 
  process.exit(1); 
});