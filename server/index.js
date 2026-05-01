require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { createClient } = require('@supabase/supabase-js');
const http = require('http');
const socketIo = require('socket.io');
const rateLimit = require('express-rate-limit');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], credentials: true } });

app.use(helmet());
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], credentials: true }));
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: { error: 'Слишком много запросов.' } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });

const pairSockets = {};

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.post('/api/pair/create', async (req, res) => {
  try {
    let code, result, attempts = 0;
    do {
      code = 'FEEL-' + Math.random().toString(36).substring(2, 6).toUpperCase();
      result = await supabase.from('pairs').insert([{ id: Date.now().toString(), code, streak: 0 }]).select().single();
      attempts++;
    } while (result.error && result.error.code === '23505' && attempts < 5);
    if (result.error) throw result.error;
    res.json({ success: true, code, pairId: result.data.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/pair/join', async (req, res) => {
  try {
    let { code } = req.body;
    code = code.trim().toUpperCase();
    if (!code.startsWith('FEEL-')) code = 'FEEL-' + code.replace('FEEL-', '');
    const { data: pair, error } = await supabase.from('pairs').select('*').eq('code', code).single();
    if (error || !pair) return res.status(404).json({ error: 'Пара не найдена' });
    res.json({ success: true, pair, pairId: pair.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/user/delete', async (req, res) => {
  try {
    const { pairCode } = req.body;
    await supabase.from('pairs').delete().eq('code', pairCode);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

io.on('connection', (socket) => {
  console.log('🔌 Connected:', socket.id);

  socket.on('join-pair', (code) => {
    socket.join(code);
    pairSockets[socket.id] = code;
    console.log(`👥 ${socket.id} joined ${code}`);
  });

  // ✅ ИСПРАВЛЕНО: Настроение теперь правильно мапится на status_a / status_b
  socket.on('update-status', async ({ code, user, value }) => {
    console.log(`📊 Status: ${user} -> ${value}`);
    const field = user === 'M' ? 'status_a' : 'status_b';
    await supabase.from('pairs').update({ [field]: value, updated_at: new Date().toISOString() }).eq('code', code);
    io.to(code).emit('status-updated', { user, value });
  });

  // ✅ ИСПРАВЛЕНО: Викторина теперь корректно сохраняет ответы обоих и открывает их
  socket.on('quiz-submit', async ({ code, user, ans }) => {
    console.log(`📝 Quiz: ${user} answered: ${ans}`);
    const { data: pair } = await supabase.from('pairs').select('quiz').eq('code', code).single();
    const currentQuiz = pair?.quiz || {};
    const field = user === 'M' ? 'ans_a' : 'ans_b';
    currentQuiz[field] = ans;
    currentQuiz.question = currentQuiz.question || 'Daily';
    currentQuiz.revealed = !!(currentQuiz.ans_a && currentQuiz.ans_b);
    
    await supabase.from('pairs').update({ quiz: currentQuiz, updated_at: new Date().toISOString() }).eq('code', code);
    io.to(code).emit('quiz-updated', { quiz: currentQuiz, updatedBy: user });
  });

  // ✅ ИСПРАВЛЕНО: Кнопка "Мир" теперь работает и рассылается обоим
  socket.on('peace-request', async ({ code, user }) => {
    console.log(`🕊️ Peace: ${user}`);
    await supabase.from('pairs').update({ peace_active: true, peace_from: user, updated_at: new Date().toISOString() }).eq('code', code);
    io.to(code).emit('peace-updated', { active: true, from: user });
  });

  // ✅ ИСПРАВЛЕНО: Ритуалы сохраняются в общую историю и синхронизируются
  socket.on('complete-ritual', async ({ code, user, text }) => {
    console.log(`✨ Ritual: ${user} -> ${text}`);
    const { data: pair } = await supabase.from('pairs').select('streak, ritual_a, ritual_b').eq('code', code).single();
    const field = user === 'M' ? 'ritual_a' : 'ritual_b';
    const other = user === 'M' ? 'ritual_b' : 'ritual_a';
    const newStreak = pair?.[other] ? (pair.streak || 0) + 1 : (pair.streak || 0);
    
    await supabase.from('pairs').update({ [field]: text, streak: newStreak, last_ritual: new Date().toISOString().split('T')[0], updated_at: new Date().toISOString() }).eq('code', code);
    
    const entry = { id: Date.now().toString(), user, text, date: new Date().toISOString() };
    await supabase.from('rituals').insert(entry);
    io.to(code).emit('ritual-updated', { ...entry, streak: newStreak });
  });

  socket.on('disconnect', () => {
    const pid = pairSockets[socket.id];
    if (pid) socket.leave(pid);
    delete pairSockets[socket.id];
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server on ${PORT}`));