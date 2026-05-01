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

// ✅ ИСПРАВЛЕНО: Создание пары
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

// ✅ ИСПРАВЛЕНО: Вход в пару
app.post('/api/pair/join', async (req, res) => {
  console.log('🔑 Join pair request:', req.body);
  try {
    let { code } = req.body;
    
    if (!code) {
      console.log('❌ No code provided');
      return res.status(400).json({ error: 'Code is required' });
    }
    
    // Очищаем код и приводим к верхнему регистру
    code = code.trim().toUpperCase();
    
    // Добавляем FEEL- если нет
    if (!code.startsWith('FEEL-')) {
      code = 'FEEL-' + code.replace('FEEL-', '');
    }
    
    console.log(`🔍 Searching for pair with code: ${code}`);
    
    // Ищем пару
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