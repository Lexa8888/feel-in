import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView,
  SafeAreaView, Alert, Platform, StatusBar, ActivityIndicator, Modal,
  KeyboardAvoidingView, FlatList, Animated, Easing, Dimensions, Linking, Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';
import { createClient } from '@supabase/supabase-js';

const { width } = Dimensions.get('window');
const IS_WEB = Platform.OS === 'web';

const CONFIG = {
  SUPABASE_URL: 'https://jgpcuebyysxkrdqkvqmz.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_xQWX7_juECMQlPzwW-cb9w_CLszetYD',
  SERVER_URL: 'https://feel-in.onrender.com'
};

const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

const TRANSLATIONS = {
  ru: {
    appTitle: 'Feel In',
    subtitle: 'Пространство для двоих',
    enterCode: 'Введите код',
    login: '🔑 Войти по коду',
    createPair: '✨ Создать пару',
    couplePulse: 'Пульс пары',
    daysTogether: 'Дней вместе',
    rituals: 'Ритуалов',
    messages: 'Сообщений',
    realTimeMood: 'Настроение в реальном времени',
    yourMood: 'Ваше настроение',
    partnerMood: 'Настроение партнёра',
    notSelected: 'Не выбрано',
    clickToChange: 'Нажмите чтобы изменить',
    clickForRecommendations: 'Нажмите для рекомендаций',
    dailyQuestion: '💭 Вопрос дня',
    hideQuestion: 'Скрыть вопрос',
    showQuestion: 'Показать вопрос',
    yourAnswer: 'Ваш ответ...',
    sendAnswer: '💌 Отправить ответ',
    answerSaved: '✅ Ответ сохранен!',
    waitingPartner: 'Ждем ответа партнера...',
    chat: '💬 Чат',
    sleepMode: '🌙 Спящий режим',
    chatBlocked: 'Чат заблокирован',
    messagePlaceholder: 'Сообщение...',
    wakeUp: '☀️ Проснуться',
    sleepNight: '🌙 Режим сна',
    settings: '⚙️ Настройки',
    calendar: '📅 Календарь',
    peace: '🕊️ Сигнал мира',
    peaceSent: '🕊️ Сигнал мира',
    peaceMessage: 'Сигнал отправлен!',
    profile: 'Профиль',
    nickname: 'Никнейм',
    avatarColor: 'Цвет аватара',
    save: 'Сохранить',
    cancel: 'Отмена',
    logout: '🚪 Выйти из пары',
    confirmLogout: 'Вы уверены что хотите выйти из пары?',
    theme: 'Тема',
    language: 'Язык',
    russian: 'Русский',
    english: 'English',
    syncGoogle: '🔄 Синхронизировать с Google',
    noEvents: 'Нет синхронизированных событий',
    upcomingEvents: 'Ближайшие события:',
    howAreYou: 'Как вы себя чувствуете?',
    close: 'Закрыть',
    recommendations: '💡 Рекомендации для партнёра',
    whatToDo: 'Что можно сделать сейчас:'
  },
  en: {
    appTitle: 'Feel In',
    subtitle: 'Space for Two',
    enterCode: 'Enter code',
    login: '🔑 Login with Code',
    createPair: '✨ Create Pair',
    couplePulse: 'Couple Pulse',
    daysTogether: 'Days Together',
    rituals: 'Rituals',
    messages: 'Messages',
    realTimeMood: 'Real-Time Mood',
    yourMood: 'Your Mood',
    partnerMood: "Partner's Mood",
    notSelected: 'Not selected',
    clickToChange: 'Click to change',
    clickForRecommendations: 'Click for recommendations',
    dailyQuestion: '💭 Question of the Day',
    hideQuestion: 'Hide Question',
    showQuestion: 'Show Question',
    yourAnswer: 'Your answer...',
    sendAnswer: '💌 Send Answer',
    answerSaved: '✅ Answer saved!',
    waitingPartner: 'Waiting for partner...',
    chat: '💬 Chat',
    sleepMode: '🌙 Sleep Mode',
    chatBlocked: 'Chat blocked',
    messagePlaceholder: 'Message...',
    wakeUp: '☀️ Wake Up',
    sleepNight: '🌙 Sleep Mode',
    settings: '⚙️ Settings',
    calendar: '📅 Calendar',
    peace: '🕊️ Peace Signal',
    peaceSent: '🕊️ Peace Signal',
    peaceMessage: 'Signal sent!',
    profile: 'Profile',
    nickname: 'Nickname',
    avatarColor: 'Avatar Color',
    save: 'Save',
    cancel: 'Cancel',
    logout: '🚪 Leave Pair',
    confirmLogout: 'Are you sure you want to leave the pair?',
    theme: 'Theme',
    language: 'Language',
    russian: 'Russian',
    english: 'English',
    syncGoogle: '🔄 Sync with Google',
    noEvents: 'No synchronized events',
    upcomingEvents: 'Upcoming events:',
    howAreYou: 'How are you feeling?',
    close: 'Close',
    recommendations: '💡 Recommendations for Partner',
    whatToDo: 'What you can do now:'
  }
};

const THEMES = {
  default: { primary: '#ff6b9d', secondary: '#6b72ff', gradient: ['#ff6b9d', '#f093fb', '#667eea'], background: '#0f0f1e', card: '#1a1a2e', text: '#ffffff' },
  ocean: { primary: '#00d4ff', secondary: '#7c3aed', gradient: ['#00d4ff', '#0ea5e9', '#7c3aed'], background: '#0c1929', card: '#1e3a5f', text: '#e0f2fe' },
  sunset: { primary: '#f97316', secondary: '#ec4899', gradient: ['#f97316', '#fb923c', '#ec4899'], background: '#1a0f1a', card: '#2d1b3d', text: '#fef3c7' },
  forest: { primary: '#22c55e', secondary: '#16a34a', gradient: ['#22c55e', '#4ade80', '#16a34a'], background: '#0a1a0f', card: '#1b3a24', text: '#dcfce7' },
  midnight: { primary: '#8b5cf6', secondary: '#6366f1', gradient: ['#8b5cf6', '#a78bfa', '#6366f1'], background: '#0a0a1a', card: '#1a1a3a', text: '#e0e7ff' }
};

// 💕 More personal and soulful questions
const DAILY_QUESTIONS = [
  "За что ты больше всего благодарен(на) нашему партнеру сегодня?",
  "Какой момент с нашим партнером заставляет тебя улыбаться до сих пор?",
  "Что в нашем партнере ты ценишь больше всего и почему?",
  "Какое наше совместное воспоминание греет тебе сердце?",
  "Что бы ты хотел(а) сказать партнеру, но пока не решался(ась)?",
  "В какой момент ты понял(а), что любишь нашего партнера?",
  "Какая мелочь партнера вызывает у тебя нежность?",
  "За что ты хочешь попросить прощения у партнера?",
  "Что делает нашего партнера уникальным в твоих глазах?",
  "Какой сон или мечта у вас общая, и как вы можете её достичь?",
  "Как партнер поддерживает тебя, когда тебе тяжело?",
  "Что бы ты хотел(а) улучшить в вашем общении?",
  "Какой комплимент партнера запомнился тебе больше всего?",
  "Что ты чувствуешь, когда партнер просто рядом?",
  "Какая ваша общая традиция тебе особенно дорога?",
  "За что ты хочешь сказать спасибо партнеру прямо сейчас?",
  "Как ты понимаешь, что партнер тебя любит?",
  "Что в ваших отношениях делает тебя сильнее?",
  "Какой ваш совместный день был самым счастливым?",
  "Что ты хочешь подарить партнеру (не материально)?",
  "Как партнер помогает тебе расти как личности?",
  "Что ты ценишь в том, как партнер заботится о тебе?",
  "Какой момент вы хотели бы пережить заново?",
  "Что партнер делает, что заставляет тебя чувствовать себя в безопасности?",
  "Как вы можете лучше поддерживать мечты друг друга?",
  "Что ты хочешь изменить в себе ради ваших отношений?",
  "Какая фраза партнера всегда поднимает тебе настроение?",
  "Что ты любишь в том, как партнер смеется?",
  "Как партнер проявляет любовь, и как ты это чувствуешь?",
  "Что вы можете сделать вместе на этой неделе, чтобы стать ближе?",
  "Какой урок вы извлекли из ваших трудностей вместе?",
  "Что партнер дает тебе, что ты не можешь найти больше нигде?",
  "Как ты можешь показать партнеру свою благодарность сегодня?",
  "Что в вашем партнере вызывает у тебя восхищение?",
  "Какой ваш совместный план на будущее тебя вдохновляет?",
  "Что ты хочешь, чтобы партнер знал о твоих чувствах?",
  "Как партнер меняет твою жизнь к лучшему?",
  "Что вы можете сделать, чтобы ваши отношения стали еще глубже?",
  "Какой момент с партнером ты будешь помнить всю жизнь?",
  "Что ты хочешь пожелать вашим отношениям на будущее?"
];

const MOODS = [
  { emoji: '😊', key: 'happy', label: 'Радость', labelEn: 'Joy', color: '#fbbf24', recommendations: ['Предложите совместную прогулку', 'Поделитесь хорошими новостями', 'Сделайте комплимент'] },
  { emoji: '😌', key: 'calm', label: 'Спокойствие', labelEn: 'Calm', color: '#60a5fa', recommendations: ['Предложите тихий вечер вместе', 'Посмотрите фильм', 'Приготовьте ужин вместе'] },
  { emoji: '😍', key: 'love', label: 'Любовь', labelEn: 'Love', color: '#f472b6', recommendations: ['Обнимите партнера', 'Скажите о своих чувствах', 'Устройте романтический вечер'] },
  { emoji: '🤗', key: 'hug', label: 'Объятия', labelEn: 'Hug', color: '#a78bfa', recommendations: ['Крепко обнимите', 'Проведите время в обнимку', 'Сделайте массаж'] },
  { emoji: '😔', key: 'sad', label: 'Грусть', labelEn: 'Sad', color: '#6b7280', recommendations: ['Выслушайте без осуждения', 'Предложите поддержку', 'Сделайте что-то приятное', 'Будьте рядом'] },
  { emoji: '😤', key: 'angry', label: 'Злость', labelEn: 'Angry', color: '#ef4444', recommendations: ['Дайте пространство', 'Не провоцируйте конфликт', 'Предложите поговорить позже', 'Будьте терпеливы'] },
  { emoji: '🔥', key: 'fire', label: 'Огонь', labelEn: 'Fire', color: '#f97316', recommendations: ['Устройте приключение', 'Попробуйте что-то новое', 'Энергично проведите время'] },
  { emoji: '🥰', key: 'adore', label: 'Обожание', labelEn: 'Adore', color: '#ec4899', recommendations: ['Скажите теплые слова', 'Сделайте сюрприз', 'Проведите время вместе'] },
  { emoji: '😴', key: 'sleepy', label: 'Хочу спать', labelEn: 'Sleepy', color: '#8b5cf6', recommendations: ['Не тревожьте', 'Пожелайте спокойной ночи', 'Укройте пледом'] },
  { emoji: '🤒', key: 'sick', label: 'Болею', labelEn: 'Sick', color: '#6ee7b7', recommendations: ['Принесите чай с мёдом', 'Будьте нежны', 'Помогите с лекарствами', 'Заботьтесь'] },
  { emoji: '😩', key: 'tired', label: 'Устал', labelEn: 'Tired', color: '#94a3b8', recommendations: ['Дайте отдохнуть', 'Сделайте массаж', 'Не нагружайте'] },
  { emoji: '🥺', key: 'miss', label: 'Скучаю', labelEn: 'Miss', color: '#f472b6', recommendations: ['Позвоните', 'Отправьте милое сообщение', 'Встретьтесь'] },
  { emoji: '🍕', key: 'hungry', label: 'Голоден', labelEn: 'Hungry', color: '#f97316', recommendations: ['Предложите поесть', 'Закажите еду', 'Приготовьте что-то вкусное'] },
  { emoji: '🥶', key: 'cold', label: 'Холодно', labelEn: 'Cold', color: '#60a5fa', recommendations: ['Укутайте пледом', 'Согрейте чаем', 'Обнимите'] },
  { emoji: '😲', key: 'surprised', label: 'Удивлен', labelEn: 'Surprised', color: '#fbbf24', recommendations: ['Расскажите подробности', 'Поделитесь эмоциями'] },
  { emoji: '😉', key: 'wink', label: 'Подмигиваю', labelEn: 'Wink', color: '#ec4899', recommendations: ['Игривое настроение!', 'Устройте сюрприз'] }
];

const AVATAR_COLORS = ['#ff6b9d', '#6b72ff', '#4ade80', '#fbbf24', '#f87171', '#38bdf8', '#a78bfa', '#f472b6'];

export default function App() {
  const [screen, setScreen] = useState('welcome');
  const [pairCode, setPairCode] = useState('');
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [connected, setConnected] = useState(false);
  const chatListRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  
  const [myMood, setMyMood] = useState(null);
  const [partnerMood, setPartnerMood] = useState(null);
  const [pulseScore, setPulseScore] = useState(0);
  const [daysTogether, setDaysTogether] = useState(0);
  const [totalMessages, setTotalMessages] = useState(0);
  const [streak, setStreak] = useState(0);
  const [myNickname, setMyNickname] = useState('Я');
  const [partnerNickname, setPartnerNickname] = useState('Партнёр');
  const [myAvatarColor, setMyAvatarColor] = useState('#ff6b9d');
  const [partnerAvatarColor, setPartnerAvatarColor] = useState('#6b72ff');
  const [todaysQuestion, setTodaysQuestion] = useState(null);
  const [myAnswer, setMyAnswer] = useState(null);
  const [partnerAnswer, setPartnerAnswer] = useState(null);
  const [answerInput, setAnswerInput] = useState('');
  const [showQuestion, setShowQuestion] = useState(true);
  
  const [sleepModeActive, setSleepModeActive] = useState(false);
  const [sleepActivatedBy, setSleepActivatedBy] = useState(null);
  const [showSleepOverlay, setShowSleepOverlay] = useState(false);
  const [sleepUntil, setSleepUntil] = useState(null);
  
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [peaceActive, setPeaceActive] = useState(false);
  const [showMoodSelector, setShowMoodSelector] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState(null);
  
  const [currentTheme, setCurrentTheme] = useState('default');
  const [language, setLanguage] = useState('ru');
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const messageAnims = useRef({});
  const starsAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const socketRef = useRef(null);
  const sentMessageIds = useRef(new Set());

  const t = TRANSLATIONS[language];
  const theme = THEMES[currentTheme];

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    loadSession();
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: false, easing: Easing.out(Easing.cubic) }).start();
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.1, duration: 2000, useNativeDriver: false }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: false })
    ])).start();
    return () => { if (socketRef.current) socketRef.current.disconnect(); };
  }, []);

  const scrollToBottom = useCallback(() => {
    if (chatListRef.current) setTimeout(() => chatListRef.current.scrollToEnd({ animated: true }), 100);
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages]);

  const loadSession = async () => {
    try {
      const [saved, days, msgs, strk, sleepData, calEvents, savedTheme, savedLang] = await Promise.all([
        AsyncStorage.getItem('feel_session'), AsyncStorage.getItem('daysTogether'),
        AsyncStorage.getItem('totalMessages'), AsyncStorage.getItem('ritualStreak'),
        AsyncStorage.getItem('sleepMode'), AsyncStorage.getItem('calendarEvents'),
        AsyncStorage.getItem('theme'), AsyncStorage.getItem('language')
      ]);
      if (saved) {
        const { code, role } = JSON.parse(saved);
        if (code && role) {
          setPairCode(code); setUserRole(role);
          if (days) setDaysTogether(parseInt(days));
          if (msgs) setTotalMessages(parseInt(msgs));
          if (strk) setStreak(parseInt(strk));
          if (calEvents) setCalendarEvents(JSON.parse(calEvents));
          if (savedTheme) setCurrentTheme(savedTheme);
          if (savedLang) setLanguage(savedLang);
          if (sleepData) {
            const sleep = JSON.parse(sleepData);
            if (sleep.active && new Date(sleep.until) > new Date()) {
              setSleepModeActive(true); setSleepActivatedBy(sleep.activatedBy); setSleepUntil(sleep.until);
              if (sleep.activatedBy !== role) setShowSleepOverlay(true);
            }
          }
          setTimeout(() => { setScreen('main'); initSocket(code, role); loadDailyQuestion(); }, 150);
        }
      }
    } catch (e) { console.log('No session'); }
  };

  const loadDailyQuestion = async () => {
    try {
      const today = new Date().toDateString();
      const lastDate = await AsyncStorage.getItem('lastQuestionDate');
      const used = JSON.parse(await AsyncStorage.getItem('usedQuestions') || '[]');
      if (lastDate !== today) {
        let available = DAILY_QUESTIONS.filter((_, i) => !used.includes(i));
        if (available.length === 0) { used.length = 0; available = DAILY_QUESTIONS; }
        const idx = Math.floor(Math.random() * available.length);
        const qIdx = DAILY_QUESTIONS.indexOf(available[idx]);
        used.push(qIdx);
        await AsyncStorage.setItem('usedQuestions', JSON.stringify(used));
        await AsyncStorage.setItem('lastQuestionDate', today);
        setTodaysQuestion(available[idx]); await AsyncStorage.setItem('todaysQuestion', available[idx]);
        setShowQuestion(true);
      } else {
        const saved = await AsyncStorage.getItem('todaysQuestion');
        if (saved) setTodaysQuestion(saved);
      }
    } catch (e) { console.error('Question error', e); }
  };

  const initSocket = (code, role) => {
    if (socketRef.current) socketRef.current.disconnect();
    const newSocket = io(CONFIG.SERVER_URL, { transports: ['websocket', 'poll'], reconnection: true, reconnectionDelay: 1000, timeout: 20000 });
    socketRef.current = newSocket;
    sentMessageIds.current.clear();
    
    newSocket.on('connect', () => { console.log('✅ Socket connected'); setConnected(true); newSocket.emit('join-pair', { pairCode: code.replace('FEEL-', ''), userRole: role }); });
    newSocket.on('joined', () => { console.log('✅ Joined room'); newSocket.emit('load-messages', { pairCode: code.replace('FEEL-', '') }); newSocket.emit('get-profiles', { pairCode: code.replace('FEEL-', '') }); });
    newSocket.on('new-message', (msg) => {
      console.log('📩 New message:', msg.id, msg.type);
      setMessages(prev => { if (prev.some(m => m.id === msg.id)) return prev; return [...prev, msg]; });
      if (msg.user_id !== role) newSocket.emit('mark-read', { pairCode: msg.pair_code, messageId: msg.id, reader: role });
      if (!messageAnims.current[msg.id]) { messageAnims.current[msg.id] = new Animated.Value(0); Animated.timing(messageAnims.current[msg.id], { toValue: 1, duration: 300, useNativeDriver: false }).start(); }
    });
    newSocket.on('messages-loaded', (msgs) => { console.log('📚 Messages loaded:', msgs?.length); setMessages(msgs || []); });
    newSocket.on('message-read', ({ messageId }) => { setMessages(prev => prev.map(m => m.id === messageId ? { ...m, read_by_partner: true } : m)); });
    newSocket.on('status-updated', (data) => { console.log('💓 Status updated:', data); if (data.user === role) setMyMood(data.value); else setPartnerMood(data.value); });
    newSocket.on('profiles-loaded', (profiles) => {
      const me = profiles?.find(p => p.user_id === role);
      const partner = profiles?.find(p => p.user_id !== role);
      if (me) { setMyNickname(me.nickname || 'Я'); setMyAvatarColor(me.avatar_color || '#ff6b9d'); }
      if (partner) { setPartnerNickname(partner.nickname || 'Партнёр'); setPartnerAvatarColor(partner.avatar_color || '#6b72ff'); }
    });
    newSocket.on('quiz-updated', (data) => {
      if (!data?.quiz) return;
      const { ans_a, ans_b } = data.quiz;
      if (ans_a && ans_b) { setMyAnswer(role === 'M' ? ans_a : ans_b); setPartnerAnswer(role === 'M' ? ans_b : ans_a); }
      else { if (role === 'M' && ans_a) setMyAnswer(ans_a); if (role === 'Ж' && ans_b) setMyAnswer(ans_b); }
    });
    newSocket.on('peace-updated', (data) => { if (data?.active) { setPeaceActive(true); Alert.alert(t.peaceSent, t.peaceMessage); } });
    newSocket.on('sleep-updated', (data) => {
      if (data.active) {
        setSleepModeActive(true); setSleepActivatedBy(data.user); setSleepUntil(data.sleepUntil);
        AsyncStorage.setItem('sleepMode', JSON.stringify({ active: true, activatedBy: data.user, until: data.sleepUntil }));
        if (data.user !== role) { setShowSleepOverlay(true); Alert.alert('🌙 Sleep Mode', 'Partner went to sleep.'); }
      } else { setSleepModeActive(false); setSleepActivatedBy(null); setSleepUntil(null); setShowSleepOverlay(false); AsyncStorage.removeItem('sleepMode'); }
    });
    newSocket.on('disconnect', () => { console.log('❌ Socket disconnected'); setConnected(false); });
  };

  const createPair = async () => {
    try {
      setLoading(true);
      const code = Math.random().toString(36).substring(2, 6).toUpperCase();
      await supabase.from('pairs').insert({ code, gender_a: 'M', gender_b: 'Ж', status_a: null, status_b: null, streak: 0, peace: { active: false }, quiz: { question: DAILY_QUESTIONS[0], ans_a: null, ans_b: null } });
      const fullCode = 'FEEL-' + code;
      await AsyncStorage.setItem('feel_session', JSON.stringify({ code: fullCode, role: 'M' }));
      await AsyncStorage.setItem('relationshipStart', new Date().toISOString());
      setUserRole('M'); setPairCode(fullCode); setDaysTogether(1);
      setTimeout(() => { setScreen('main'); loadDailyQuestion(); initSocket(fullCode, 'M'); }, 200);
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  };

  const joinPair = async () => {
    const raw = pairCode.trim().toUpperCase();
    if (!raw) { Alert.alert('Error', 'Enter code'); return; }
    const cleanCode = raw.replace('FEEL-', '');
    const fullCode = 'FEEL-' + cleanCode;
    try {
      setLoading(true);
      const { data, error } = await supabase.from('pairs').select('*').eq('code', cleanCode).limit(1);
      const pair = data?.[0];
      if (error || !pair) { Alert.alert('Error', `Pair "${cleanCode}" not found.`); return; }
      await AsyncStorage.setItem('feel_session', JSON.stringify({ code: fullCode, role: 'Ж' }));
      const start = await AsyncStorage.getItem('relationshipStart');
      if (start) setDaysTogether(Math.max(0, Math.floor((Date.now() - new Date(start)) / 86400000)));
      setUserRole('Ж'); setPairCode(fullCode);
      setTimeout(() => { setScreen('main'); loadDailyQuestion(); initSocket(fullCode, 'Ж'); }, 200);
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  };

  const sendMessage = (text) => {
    const content = text || chatInput;
    if (!content.trim() || sleepModeActive || !socketRef.current) return;
    const msgId = Date.now().toString();
    const msg = { id: msgId, pair_code: pairCode.replace('FEEL-', ''), user_id: userRole, nickname: myNickname, text: content.trim(), type: 'text', created_at: new Date().toISOString(), read_by_partner: false };
    console.log('📤 Sending message:', msg);
    sentMessageIds.current.add(msgId);
    setMessages(prev => { if (prev.some(m => m.id === msgId)) return prev; return [...prev, msg]; });
    socketRef.current.emit('send-message', msg);
    setChatInput('');
    setTotalMessages(prev => { const n = prev + 1; AsyncStorage.setItem('totalMessages', n.toString()); return n; });
  };

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onloadend = () => sendMessage(null, 'image', reader.result);
    reader.readAsDataURL(file);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => sendMessage(null, 'voice', {  reader.result, duration: 0 });
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorderRef.current.start(); setIsRecording(true);
    } catch (err) { Alert.alert('Error', 'Microphone access denied'); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) { mediaRecorderRef.current.stop(); setIsRecording(false); }
  };

  const playVoiceMessage = (msg) => {
    if (playingMessageId === msg.id) setPlayingMessageId(null);
    else { setPlayingMessageId(msg.id); const audio = new Audio(msg.mediaUrl); audio.onended = () => setPlayingMessageId(null); audio.play(); }
  };

  const updateMood = (key) => {
    if (!socketRef.current) return;
    setMyMood(key); setShowMoodSelector(false);
    socketRef.current.emit('update-status', { code: pairCode.replace('FEEL-', ''), user: userRole, value: key });
  };

  const showPartnerRecommendations = () => {
    if (partnerMood) setShowRecommendations(true);
    else Alert.alert('Info', 'Partner has not selected a mood yet');
  };

  const submitAnswer = () => {
    if (!answerInput.trim() || !socketRef.current || !todaysQuestion) return;
    setMyAnswer(answerInput.trim());
    socketRef.current.emit('quiz-submit', { pairCode: pairCode.replace('FEEL-', ''), user: userRole, ans: answerInput.trim() });
    setAnswerInput(''); Alert.alert(t.answerSaved, t.waitingPartner);
  };

  const sendPeace = () => {
    if (!socketRef.current) return;
    socketRef.current.emit('peace-request', { pairCode: pairCode.replace('FEEL-', ''), user: userRole });
    setPeaceActive(true); Alert.alert(t.peaceSent, t.peaceMessage);
  };

  const toggleSleep = () => {
    if (!socketRef.current) return;
    if (sleepModeActive && sleepActivatedBy === userRole) {
      setSleepModeActive(false); setSleepActivatedBy(null); setSleepUntil(null); setShowSleepOverlay(false);
      AsyncStorage.removeItem('sleepMode');
      socketRef.current.emit('sleep-toggle', { pairCode: pairCode.replace('FEEL-', ''), user: userRole, active: false });
    } else {
      const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(6, 0, 0, 0);
      setSleepModeActive(true); setSleepActivatedBy(userRole); setSleepUntil(tomorrow.toISOString());
      AsyncStorage.setItem('sleepMode', JSON.stringify({ active: true, activatedBy: userRole, until: tomorrow.toISOString() }));
      socketRef.current.emit('sleep-toggle', { pairCode: pairCode.replace('FEEL-', ''), user: userRole, active: true, sleepUntil: tomorrow.toISOString() });
    }
  };

  const syncWithGoogleCalendar = async () => {
    try {
      Linking.openURL(`https://accounts.google.com/o/oauth2/v2/auth?client_id=YOUR_CLIENT_ID&redirect_uri=${encodeURIComponent('https://feel-in.vercel.app/auth/google')}&response_type=token&scope=https://www.googleapis.com/auth/calendar.readonly`);
      Alert.alert('📅 Google Calendar', 'Open browser to authorize');
    } catch (e) { Alert.alert('Error', 'Could not sync calendar'); }
  };

  const updateProfile = async () => {
    if (!socketRef.current) return;
    socketRef.current.emit('update-profile', { pairCode: pairCode.replace('FEEL-', ''), user: userRole, nickname: myNickname, avatarColor: myAvatarColor });
    await AsyncStorage.setItem('myNickname', myNickname); await AsyncStorage.setItem('myAvatarColor', myAvatarColor);
    setShowProfileModal(false); Alert.alert('✅ Profile updated');
  };

  const changeTheme = async (name) => { setCurrentTheme(name); await AsyncStorage.setItem('theme', name); };
  const changeLanguage = async (lang) => { setLanguage(lang); await AsyncStorage.setItem('language', lang); };

  const logout = async () => {
    Alert.alert(t.logout, t.confirmLogout, [
      { text: t.cancel, style: 'cancel' },
      { text: t.logout, style: 'destructive', onPress: async () => {
        if (socketRef.current) socketRef.current.disconnect();
        await AsyncStorage.removeItem('feel_session');
        setScreen('welcome'); setPairCode(''); setUserRole(null); setMessages([]); setShowSettings(false);
      }}
    ]);
  };

  useEffect(() => {
    let score = 0;
    if (myMood && partnerMood && myMood === partnerMood) score += 40;
    else if (myMood || partnerMood) score += 15;
    if (streak > 0) score += Math.min(30, streak * 3);
    if (totalMessages > 0) score += Math.min(20, Math.floor(totalMessages / 10));
    setPulseScore(Math.min(100, score));
  }, [myMood, partnerMood, streak, totalMessages]);

  useEffect(() => {
    if (sleepModeActive && sleepUntil) {
      const check = setInterval(() => {
        if (new Date() > new Date(sleepUntil)) {
          setSleepModeActive(false); setSleepActivatedBy(null); setSleepUntil(null); setShowSleepOverlay(false);
          AsyncStorage.removeItem('sleepMode');
          if (socketRef.current) socketRef.current.emit('sleep-toggle', { pairCode: pairCode.replace('FEEL-', ''), user: userRole, active: false });
        }
      }, 60000);
      return () => clearInterval(check);
    }
  }, [sleepModeActive, sleepUntil, pairCode, userRole]);

  const myMoodData = MOODS.find(m => m.key === myMood);
  const partnerMoodData = MOODS.find(m => m.key === partnerMood);
  const getMoodLabel = (mood) => language === 'ru' ? mood.label : mood.labelEn;

  if (screen === 'welcome') {
    return (
      <LinearGradient colors={theme.gradient} style={styles.container}>
        <Animated.View style={[styles.center, { opacity: fadeAnim }]}>
          <Animated.View style={[styles.premiumLogo, { transform: [{ scale: pulseAnim }] }]}>
            <Text style={styles.logoEmoji}>💕</Text><View style={styles.logoGlow} />
          </Animated.View>
          <Text style={styles.premiumTitle}>{t.appTitle}</Text>
          <Text style={styles.premiumSubtitle}>{t.subtitle}</Text>
          <View style={styles.inputContainer}>
            <TextInput style={styles.premiumInput} placeholder={t.enterCode} placeholderTextColor="#8892b0" value={pairCode} onChangeText={setPairCode} autoCapitalize="characters" editable={!loading} />
          </View>
          <TouchableOpacity style={styles.premiumButton} onPress={joinPair} disabled={loading} activeOpacity={0.8}>
            <LinearGradient colors={theme.gradient} style={styles.buttonGradient}><Text style={styles.premiumButtonText}>{t.login}</Text></LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.premiumButtonSecondary} onPress={createPair} disabled={loading} activeOpacity={0.8}>
            <Text style={[styles.premiumButtonSecondaryText, { color: theme.primary }]}>{t.createPair}</Text>
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>
    );
  }

  if (showSleepOverlay) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#0a0a1a' }]}>
        <Animated.View style={[styles.starsContainer, { opacity: starsAnim }]}>
          {[...Array(30)].map((_, i) => <View key={i} style={[styles.star, { left: `${Math.random()*100}%`, top: `${Math.random()*100}%`, width: Math.random()*4+2, height: Math.random()*4+2 }]} />)}
        </Animated.View>
        <View style={styles.sleepOverlayContent}>
          <Text style={styles.sleepIcon}>🌙</Text><Text style={styles.sleepTitle}>Sleep Mode</Text>
          <Text style={styles.sleepText}>Partner went to sleep</Text><Text style={styles.sleepSubtext}>Chat blocked until 6:00</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <LinearGradient colors={theme.gradient} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* HEADER WITH PULSE + STATS */}
        <LinearGradient colors={theme.gradient} style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <View><Text style={styles.headerTitle}>{t.appTitle}</Text><Text style={styles.headerCode}>{pairCode}</Text></View>
              <Animated.View style={[styles.headerPulse, { transform: [{ scale: pulseAnim }] }]}>
                <Text style={styles.headerPulseHeart}>💓</Text>
                <Text style={styles.headerPulseText}>{pulseScore}%</Text>
              </Animated.View>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity onPress={sendPeace} style={styles.headerIconButton}><Text style={styles.headerIcon}>🕊️</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setShowCalendar(true)} style={styles.headerIconButton}><Text style={styles.headerIcon}>📅</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setShowSettings(true)} style={styles.headerIconButton}><Text style={styles.headerIcon}>⚙️</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setShowProfileModal(true)}><View style={[styles.avatar, { backgroundColor: myAvatarColor }]} /></TouchableOpacity>
            </View>
          </View>
          {/* Stats row in header */}
          <View style={styles.headerStats}>
            <View style={styles.headerStatItem}><Text style={styles.headerStatValue}>{daysTogether}</Text><Text style={styles.headerStatLabel}>{t.daysTogether}</Text></View>
            <View style={styles.headerStatDivider} />
            <View style={styles.headerStatItem}><Text style={styles.headerStatValue}>{streak}</Text><Text style={styles.headerStatLabel}>{t.rituals}</Text></View>
            <View style={styles.headerStatDivider} />
            <View style={styles.headerStatItem}><Text style={styles.headerStatValue}>{totalMessages}</Text><Text style={styles.headerStatLabel}>{t.messages}</Text></View>
          </View>
        </LinearGradient>
        
        {peaceActive && <View style={styles.peaceBanner}><Text style={{ color: '#4ade80', fontWeight: '700' }}>{t.peace}</Text></View>}
        <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleImageSelect} />
        
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* MOOD SECTION */}
          <View style={styles.realTimeStatus}>
            <LinearGradient colors={['rgba(255,107,157,0.15)', 'rgba(102,126,234,0.15)']} style={styles.statusCardTop}>
              <Text style={styles.statusSectionTitle}>{t.realTimeMood}</Text>
              <View style={styles.statusRowTop}>
                <TouchableOpacity style={styles.statusBox} onPress={() => setShowMoodSelector(true)} activeOpacity={0.7}>
                  <Text style={styles.statusLabelTop}>{t.yourMood}</Text>
                  <Animated.View style={[styles.statusEmojiContainer, { transform: [{ scale: pulseAnim }] }]}><Text style={styles.statusEmojiLarge}>{myMoodData?.emoji || '😐'}</Text></Animated.View>
                  <Text style={styles.statusName}>{myMoodData ? getMoodLabel(myMoodData) : t.notSelected}</Text>
                  <Text style={styles.statusHint}>{t.clickToChange}</Text>
                </TouchableOpacity>
                <View style={styles.statusDividerVertical} />
                <TouchableOpacity style={styles.statusBox} onPress={showPartnerRecommendations} activeOpacity={0.7}>
                  <Text style={styles.statusLabelTop}>{t.partnerMood}</Text>
                  <Animated.View style={[styles.statusEmojiContainer, { transform: [{ scale: pulseAnim }] }]}><Text style={styles.statusEmojiLarge}>{partnerMoodData?.emoji || '😐'}</Text></Animated.View>
                  <Text style={styles.statusName}>{partnerMoodData ? getMoodLabel(partnerMoodData) : t.notSelected}</Text>
                  <Text style={styles.statusHint}>{t.clickForRecommendations}</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>

          {/* COLLAPSIBLE DAILY QUESTION */}
          {todaysQuestion && (
            <View style={[styles.questionCard, { backgroundColor: theme.card+'80' }]}>
              <TouchableOpacity style={styles.questionHeader} onPress={() => setShowQuestion(!showQuestion)}>
                <Text style={styles.questionTitle}>{t.dailyQuestion}</Text>
                <Text style={styles.questionToggle}>{showQuestion ? '▼' : '▶'}</Text>
              </TouchableOpacity>
              
              {showQuestion && (
                <>
                  <Text style={styles.questionText}>{todaysQuestion}</Text>
                  {!myAnswer ? (
                    <View>
                      <TextInput style={[styles.answerInput, { backgroundColor: theme.background+'80' }]} placeholder={t.yourAnswer} placeholderTextColor="#8892b0" value={answerInput} onChangeText={setAnswerInput} multiline numberOfLines={3} />
                      <TouchableOpacity style={[styles.answerBtn, { backgroundColor: theme.secondary }]} onPress={submitAnswer}><Text style={styles.answerBtnText}>{t.sendAnswer}</Text></TouchableOpacity>
                    </View>
                  ) : partnerAnswer ? (
                    <View style={styles.answersRevealed}>
                      <View style={[styles.answerBox, { backgroundColor: theme.background+'80' }]}><Text style={styles.answerLabel}>{language==='ru'?'Ваш ответ:':'Your answer:'}</Text><Text style={styles.answerValue}>{myAnswer}</Text></View>
                      <View style={[styles.answerBox, { backgroundColor: theme.background+'80' }]}><Text style={styles.answerLabel}>{language==='ru'?'Ответ партнёра:':"Partner's answer:"}</Text><Text style={styles.answerValue}>{partnerAnswer}</Text></View>
                    </View>
                  ) : (
                    <View style={styles.waitingAnswer}><Text style={styles.waitingText}>⏳ {language==='ru'?'Ваш ответ сохранен':'Answer saved'}</Text><Text style={styles.waitingSubtext}>{t.waitingPartner}</Text></View>
                  )}
                </>
              )}
              
              {!showQuestion && myAnswer && (
                <Text style={styles.questionCollapsedText}>{language==='ru'?'Ответ дан. Нажмите чтобы развернуть':'Answered. Tap to expand'}</Text>
              )}
            </View>
          )}

          {/* CHAT */}
          <View style={styles.chatSection}>
            <View style={styles.chatHeader}><Text style={styles.sectionTitle}>{t.chat}</Text>{sleepModeActive && <View style={styles.sleepBadge}><Text style={styles.sleepBadgeText}>{t.sleepMode}</Text></View>}</View>
            <View style={[styles.chatContainer, { backgroundColor: theme.background+'40' }]}>
              <FlatList ref={chatListRef} data={messages} keyExtractor={i=>i.id}
                renderItem={({ item }) => {
                  if (!messageAnims.current[item.id]) messageAnims.current[item.id] = new Animated.Value(0);
                  const isMine = item.user_id === userRole;
                  return (
                    <Animated.View style={[styles.messageBubble, isMine ? styles.messageMine : styles.messagePartner, { opacity: messageAnims.current[item.id], backgroundColor: isMine ? theme.primary : theme.card }]}>
                      <Text style={styles.messageNickname}>{item.nickname || (isMine ? myNickname : partnerNickname)}</Text>
                      {item.type==='image' && item.mediaUrl && <Image source={{uri:item.mediaUrl}} style={styles.messageImage} />}
                      {item.type==='voice' && (
                        <TouchableOpacity style={[styles.voiceMessage, playingMessageId===item.id && styles.voiceMessagePlaying]} onPress={()=>playVoiceMessage(item)}>
                          <Text style={styles.voiceIcon}>{playingMessageId===item.id ? '⏸️' : '▶️'}</Text>
                          <View style={styles.voiceWaveform}>{[...Array(15)].map((_,i)=><Animated.View key={i} style={[styles.waveBar, playingMessageId===item.id && {animation:'wave 0.5s infinite', animationDelay:`${i*0.05}s`}]}/>)}</View>
                          <Text style={styles.voiceDuration}>0:05</Text>
                        </TouchableOpacity>
                      )}
                      {item.text && item.type==='text' && <Text style={styles.messageText}>{item.text}</Text>}
                      <View style={styles.messageFooter}>
                        <Text style={styles.messageTime}>{new Date(item.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</Text>
                        {isMine && <Text style={styles.readStatus}>{item.read_by_partner===true ? '❤️❤️' : item.read_by_partner===false ? '🤍' : '✓'}</Text>}
                      </View>
                    </Animated.View>
                  );
                }}
                style={styles.chatList} contentContainerStyle={{flexGrow:1, justifyContent:'flex-end', padding:8}}
              />
            </View>
            <KeyboardAvoidingView behavior={IS_WEB?'height':'padding'}>
              <View style={styles.inputRow}>
                <TouchableOpacity onPress={()=>fileInputRef.current?.click()} style={styles.attachButton}>
                  <Text style={styles.attachIcon}>🖼️</Text>
                </TouchableOpacity>
                <TextInput style={[styles.chatInput, sleepModeActive&&styles.chatInputDisabled, {backgroundColor:theme.background+'80'}]} placeholder={sleepModeActive?t.chatBlocked:t.messagePlaceholder} placeholderTextColor={sleepModeActive?"#666":"#8892b0"} value={chatInput} onChangeText={setChatInput} onSubmitEditing={()=>sendMessage(chatInput)} returnKeyType="send" editable={!sleepModeActive} />
                <TouchableOpacity style={[styles.recordButton, isRecording&&styles.recordButtonActive]} onPressIn={startRecording} onPressOut={stopRecording} disabled={sleepModeActive}>
                  <Text style={styles.recordIcon}>{isRecording?'⏹':'🎙️'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.sendBtn, sleepModeActive&&styles.sendBtnDisabled, {backgroundColor:theme.primary}]} onPress={()=>sendMessage(chatInput)} disabled={sleepModeActive}><Text style={styles.sendText}>➤</Text></TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
            <TouchableOpacity style={[styles.sleepButton, sleepModeActive&&sleepActivatedBy===userRole&&styles.sleepButtonActive, {backgroundColor:theme.background+'80'}]} onPress={toggleSleep}>
              <Text style={styles.sleepButtonText}>{sleepModeActive&&sleepActivatedBy===userRole ? t.wakeUp : t.sleepNight}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* MODALS */}
      <Modal visible={showMoodSelector} transparent animationType="fade"><View style={styles.modalOverlay}><View style={[styles.moodModalContent, {backgroundColor:theme.card}]}>
        <Text style={[styles.modalTitle, {color:theme.text}]}>{t.howAreYou}</Text>
        <View style={styles.moodGrid}>{MOODS.map(m=>(<TouchableOpacity key={m.key} style={[styles.moodOption, myMood===m.key && {backgroundColor:m.color, borderColor:'#fff', borderWidth:2}]} onPress={()=>updateMood(m.key)}><Text style={styles.moodOptionEmoji}>{m.emoji}</Text><Text style={[styles.moodOptionLabel, myMood===m.key && {color:'#fff'}]}>{getMoodLabel(m)}</Text></TouchableOpacity>))}</View>
        <TouchableOpacity onPress={()=>setShowMoodSelector(false)} style={{marginTop:20}}><Text style={{color:'#8892b0'}}>{t.close}</Text></TouchableOpacity>
      </View></View></Modal>

      <Modal visible={showRecommendations} transparent animationType="fade"><View style={styles.modalOverlay}><View style={[styles.recommendationModalContent, {backgroundColor:theme.card}]}>
        <Text style={[styles.modalTitle, {color:theme.text}]}>{t.recommendations}</Text>
        <View style={styles.partnerMoodDisplay}><Text style={styles.partnerMoodEmoji}>{partnerMoodData?.emoji}</Text><Text style={[styles.partnerMoodName, {color:theme.text}]}>{partnerMoodData ? getMoodLabel(partnerMoodData) : ''}</Text></View>
        <Text style={[styles.recommendationTitle, {color:theme.secondary}]}>{t.whatToDo}</Text>
        <View style={styles.recommendationsList}>{partnerMoodData?.recommendations.map((r,i)=>(<View key={i} style={styles.recommendationItem}><Text style={styles.recommendationDot}>•</Text><Text style={styles.recommendationText}>{r}</Text></View>))}</View>
        <TouchableOpacity onPress={()=>setShowRecommendations(false)} style={styles.closeBtn}><Text style={styles.closeBtnText}>{t.close}</Text></TouchableOpacity>
      </View></View></Modal>

      <Modal visible={showCalendar} transparent animationType="fade"><View style={styles.modalOverlay}><View style={[styles.calendarModalContent, {backgroundColor:theme.card}]}>
        <Text style={[styles.modalTitle, {color:theme.text}]}>{t.calendar}</Text>
        <TouchableOpacity style={[styles.calendarSyncBtn, {backgroundColor:'#4285f4'}]} onPress={syncWithGoogleCalendar}><Text style={styles.calendarSyncText}>{t.syncGoogle}</Text></TouchableOpacity>
        <View style={styles.eventsList}><Text style={[styles.eventsTitle, {color:theme.text}]}>{t.upcomingEvents}</Text>{calendarEvents.length===0?<Text style={[styles.noEvents, {color:'#8892b0'}]}>{t.noEvents}</Text>:calendarEvents.slice(0,5).map((e,i)=>(<View key={i} style={styles.eventItem}><Text style={[styles.eventTitle, {color:theme.text}]}>{e.title}</Text><Text style={styles.eventDate}>{new Date(e.date).toLocaleString()}</Text></View>))}</View>
        <TouchableOpacity onPress={()=>setShowCalendar(false)} style={styles.closeBtn}><Text style={styles.closeBtnText}>{t.close}</Text></TouchableOpacity>
      </View></View></Modal>

      {/* SETTINGS MODAL WITH LOGOUT */}
      <Modal visible={showSettings} transparent animationType="fade"><View style={styles.modalOverlay}><View style={[styles.settingsModal, {backgroundColor:theme.card}]}>
        <Text style={[styles.modalTitle, {color:theme.text}]}>{t.settings}</Text>
        
        <Text style={[styles.settingLabel, {color:theme.text}]}>{t.theme}</Text>
        <View style={styles.themeRow}>{Object.keys(THEMES).map(n=>(<TouchableOpacity key={n} style={[styles.themeOption, currentTheme===n && {borderColor:theme.primary, borderWidth:2}]} onPress={()=>changeTheme(n)}><LinearGradient colors={THEMES[n].gradient} style={styles.themePreview} /><Text style={[styles.themeLabel, {color:theme.text}]}>{n}</Text></TouchableOpacity>))}</View>
        
        <Text style={[styles.settingLabel, {color:theme.text}]}>{t.language}</Text>
        <View style={styles.languageRow}>
          <TouchableOpacity style={[styles.langOption, language==='ru' && {backgroundColor:theme.primary}]} onPress={()=>changeLanguage('ru')}><Text style={[styles.langText, language==='ru' && {color:'#fff'}]}>🇷🇺 {t.russian}</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.langOption, language==='en' && {backgroundColor:theme.primary}]} onPress={()=>changeLanguage('en')}><Text style={[styles.langText, language==='en' && {color:'#fff'}]}>🇬🇧 {t.english}</Text></TouchableOpacity>
        </View>
        
        <View style={styles.settingsDivider} />
        
        {/* Logout button in settings */}
        <TouchableOpacity style={[styles.logoutBtn, {backgroundColor:'rgba(239,68,68,0.2)', borderColor:'rgba(239,68,68,0.4)', borderWidth:1}]} onPress={logout}>
          <Text style={[styles.logoutBtnText, {color:'#ef4444'}]}>{t.logout}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.settingsBtn, {backgroundColor:theme.background+'80'}]} onPress={()=>setShowSettings(false)}><Text style={[styles.settingsBtnText, {color:theme.text}]}>{t.close}</Text></TouchableOpacity>
      </View></View></Modal>

      <Modal visible={showProfileModal} transparent animationType="fade"><View style={styles.modalOverlay}><View style={[styles.modalContent, {backgroundColor:theme.card}]}>
        <Text style={[styles.modalTitle, {color:theme.text}]}>{t.profile}</Text>
        <TextInput style={[styles.modalInput, {backgroundColor:theme.background+'80', color:theme.text}]} placeholder={t.nickname} placeholderTextColor="#8892b0" value={myNickname} onChangeText={setMyNickname} maxLength={20} />
        <Text style={[styles.modalLabel, {color:'#8892b0'}]}>{t.avatarColor}</Text>
        <View style={styles.colorRow}>{AVATAR_COLORS.map(c=>(<TouchableOpacity key={c} style={[styles.colorBtn, {backgroundColor:c, borderColor:myAvatarColor===c?'#fff':'transparent', borderWidth:2}]} onPress={()=>setMyAvatarColor(c)} />))}</View>
        <TouchableOpacity style={[styles.modalBtn, {backgroundColor:theme.primary}]} onPress={updateProfile}><Text style={styles.modalBtnText}>{t.save}</Text></TouchableOpacity>
        <TouchableOpacity onPress={()=>setShowProfileModal(false)}><Text style={{color:'#8892b0', marginTop:12}}>{t.cancel}</Text></TouchableOpacity>
      </View></View></Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  premiumLogo: { width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 32, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  logoGlow: { position: 'absolute', width: '100%', height: '100%', borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.2)' },
  logoEmoji: { fontSize: 72 },
  premiumTitle: { fontSize: 42, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  premiumSubtitle: { fontSize: 18, color: 'rgba(255,255,255,0.8)', marginBottom: 48, textAlign: 'center' },
  inputContainer: { width: '100%', marginBottom: 24 },
  premiumInput: { width: '100%', backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff', padding: 20, borderRadius: 16, fontSize: 20, textAlign: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  premiumButton: { width: '100%', borderRadius: 16, marginBottom: 16, overflow: 'hidden' },
  buttonGradient: { padding: 18, alignItems: 'center' },
  premiumButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  premiumButtonSecondary: { width: '100%', backgroundColor: 'transparent', padding: 18, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', alignItems: 'center' },
  premiumButtonSecondaryText: { fontSize: 18, fontWeight: '600' },
  
  header: { padding: 12, paddingTop: 8 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  headerCode: { fontSize: 10, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  headerPulse: { flexDirection: 'row', alignItems: 'center', marginLeft: 12, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 16 },
  headerPulseHeart: { fontSize: 18, marginRight: 4 },
  headerPulseText: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  headerIconButton: { marginRight: 6, padding: 4 },
  headerIcon: { fontSize: 22 },
  avatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  
  headerStats: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12 },
  headerStatItem: { alignItems: 'center', flex: 1 },
  headerStatValue: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  headerStatLabel: { fontSize: 9, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  headerStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 8, alignSelf: 'stretch' },
  
  scroll: { flex: 1 },
  peaceBanner: { backgroundColor: 'rgba(74,222,128,0.15)', padding: 10, marginHorizontal: 16, marginTop: 8, borderRadius: 10, alignItems: 'center' },
  
  realTimeStatus: { margin: 16, marginTop: 8 },
  statusCardTop: { borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(255,107,157,0.3)' },
  statusSectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 16, textAlign: 'center' },
  statusRowTop: { flexDirection: 'row' },
  statusBox: { flex: 1, alignItems: 'center', padding: 8 },
  statusLabelTop: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 8, textAlign: 'center' },
  statusEmojiContainer: { padding: 6, marginBottom: 6 },
  statusEmojiLarge: { fontSize: 40 },
  statusName: { fontSize: 14, color: '#fff', fontWeight: '600', marginBottom: 4 },
  statusHint: { fontSize: 10, color: '#64ffda', textAlign: 'center' },
  statusDividerVertical: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 10 },
  
  questionCard: { backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 16, marginBottom: 12, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  questionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  questionTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', flex: 1 },
  questionToggle: { fontSize: 16, color: 'rgba(255,255,255,0.6)', marginLeft: 12 },
  questionText: { fontSize: 15, color: '#ccd6f6', marginBottom: 16, textAlign: 'center', fontStyle: 'italic', lineHeight: 20 },
  questionCollapsedText: { fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center', paddingVertical: 8 },
  answerInput: { backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff', padding: 12, borderRadius: 10, minHeight: 80, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  answerBtn: { backgroundColor: '#64ffda', padding: 14, borderRadius: 10, alignItems: 'center' },
  answerBtnText: { color: '#1a1a2e', fontWeight: 'bold', fontSize: 14 },
  answersRevealed: { gap: 10 },
  answerBox: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  answerLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginBottom: 6 },
  answerValue: { fontSize: 14, color: '#fff', lineHeight: 20 },
  waitingAnswer: { alignItems: 'center', padding: 16 },
  waitingText: { fontSize: 14, color: '#64ffda', fontWeight: '600', marginBottom: 6 },
  waitingSubtext: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  
  chatSection: { marginHorizontal: 16, marginBottom: 12 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  sleepBadge: { backgroundColor: 'rgba(102,126,234,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(102,126,234,0.3)' },
  sleepBadgeText: { color: 'rgba(255,255,255,0.7)', fontSize: 10 },
  chatContainer: { height: 280, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, marginBottom: 8, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  chatList: { flex: 1 },
  messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 14, marginBottom: 8 },
  messageMine: { backgroundColor: '#ff6b9d', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  messagePartner: { backgroundColor: 'rgba(255,255,255,0.1)', alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  messageImage: { width: 180, height: 180, borderRadius: 10, marginBottom: 6, alignSelf: 'flex-start' },
  voiceMessage: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', padding: 10, borderRadius: 10, marginBottom: 6, minWidth: 140 },
  voiceMessagePlaying: { backgroundColor: 'rgba(102,126,234,0.3)' },
  voiceIcon: { fontSize: 20, marginRight: 10 },
  voiceWaveform: { flexDirection: 'row', alignItems: 'center', flex: 1, height: 24, paddingHorizontal: 6 },
  waveBar: { width: 3, height: 12, backgroundColor: '#fff', marginHorizontal: 1, borderRadius: 2 },
  voiceDuration: { color: '#fff', fontSize: 10, marginLeft: 6 },
  messageNickname: { fontSize: 10, color: 'rgba(255,255,255,0.8)', marginBottom: 4, fontWeight: '600' },
  messageText: { fontSize: 13, color: '#fff', marginBottom: 4, lineHeight: 18 },
  messageFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  messageTime: { fontSize: 9, color: 'rgba(255,255,255,0.6)' },
  readStatus: { fontSize: 12, marginLeft: 4 },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  attachButton: { padding: 8, marginRight: 4 },
  attachIcon: { fontSize: 22 },
  chatInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff', padding: 12, borderRadius: 20, marginRight: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  chatInputDisabled: { backgroundColor: 'rgba(255,255,255,0.02)', color: '#666', borderColor: 'rgba(255,255,255,0.05)' },
  recordButton: { width: 40, height: 40, backgroundColor: '#ef4444', borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 4 },
  recordButtonActive: { backgroundColor: '#dc2626', transform: [{ scale: 1.1 }] },
  recordIcon: { fontSize: 20 },
  sendBtn: { width: 40, height: 40, backgroundColor: '#ff6b9d', borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: '#444' },
  sendText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  sleepButton: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  sleepButtonActive: { backgroundColor: 'rgba(102,126,234,0.2)', borderColor: 'rgba(102,126,234,0.4)' },
  sleepButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#1a1a2e', padding: 24, borderRadius: 20, width: '85%', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  settingsModal: { backgroundColor: '#1a1a2e', padding: 24, borderRadius: 20, width: '85%', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', maxHeight: '85%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 20 },
  settingLabel: { fontSize: 14, fontWeight: '600', marginBottom: 10, alignSelf: 'flex-start', width: '100%' },
  modalInput: { width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff', padding: 12, borderRadius: 10, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalLabel: { fontSize: 12, color: '#8892b0', marginBottom: 10, alignSelf: 'flex-start', width: '100%' },
  modalBtn: { backgroundColor: '#ff6b9d', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 10 },
  modalBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  colorRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  colorBtn: { width: 36, height: 36, borderRadius: 18 },
  settingsBtn: { width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', padding: 14, borderRadius: 10, marginBottom: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  settingsBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  settingsDivider: { width: '100%', height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 12 },
  logoutBtn: { width: '100%', padding: 14, borderRadius: 10, marginBottom: 10, alignItems: 'center' },
  logoutBtnText: { fontSize: 14, fontWeight: '600' },
  
  themeRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16, flexWrap: 'wrap' },
  themeOption: { width: '30%', borderRadius: 10, padding: 6, alignItems: 'center', marginBottom: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  themePreview: { width: '100%', height: 36, borderRadius: 6, marginBottom: 4 },
  themeLabel: { fontSize: 10, textAlign: 'center' },
  languageRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  langOption: { flex: 1, padding: 10, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  langText: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  
  moodModalContent: { backgroundColor: '#1a1a2e', padding: 24, borderRadius: 20, width: '90%', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', maxHeight: '80%' },
  moodGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 },
  moodOption: { width: '30%', backgroundColor: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 12, margin: '1%', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  moodOptionEmoji: { fontSize: 28, marginBottom: 4 },
  moodOptionLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
  
  recommendationModalContent: { backgroundColor: '#1a1a2e', padding: 24, borderRadius: 20, width: '90%', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  partnerMoodDisplay: { alignItems: 'center', marginVertical: 12 },
  partnerMoodEmoji: { fontSize: 48 },
  partnerMoodName: { fontSize: 18, color: '#fff', fontWeight: '600', marginTop: 6 },
  recommendationTitle: { fontSize: 14, color: '#64ffda', fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  recommendationsList: { width: '100%', paddingHorizontal: 4 },
  recommendationItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, padding: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10 },
  recommendationDot: { fontSize: 18, color: '#fbbf24', marginRight: 10, marginTop: -2 },
  recommendationText: { flex: 1, fontSize: 13, color: '#ccd6f6', lineHeight: 18 },
  closeBtn: { marginTop: 16, paddingVertical: 10, paddingHorizontal: 24, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10 },
  closeBtnText: { color: '#fff', fontWeight: '600' },
  
  calendarModalContent: { backgroundColor: '#1a1a2e', padding: 24, borderRadius: 20, width: '90%', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', maxHeight: '80%' },
  calendarSyncBtn: { backgroundColor: '#4285f4', padding: 14, borderRadius: 10, marginBottom: 16, width: '100%', alignItems: 'center' },
  calendarSyncText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  eventsList: { width: '100%', maxHeight: 180 },
  eventsTitle: { fontSize: 14, color: '#fff', fontWeight: '600', marginBottom: 10 },
  noEvents: { color: '#8892b0', textAlign: 'center', padding: 16 },
  eventItem: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 8, marginBottom: 6 },
  eventTitle: { color: '#fff', fontWeight: '600', marginBottom: 2, fontSize: 13 },
  eventDate: { color: '#8892b0', fontSize: 10 },
  
  starsContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  star: { position: 'absolute', backgroundColor: '#fff', borderRadius: 50 },
  sleepOverlayContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  sleepIcon: { fontSize: 80, marginBottom: 24 },
  sleepTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  sleepText: { fontSize: 18, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginBottom: 8 },
  sleepSubtext: { fontSize: 14, color: '#667eea', textAlign: 'center' }
});