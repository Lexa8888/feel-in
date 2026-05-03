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
    couplePulse: '💓 Пульс пары',
    daysTogether: 'Дней вместе',
    realTimeMood: 'Настроение в реальном времени',
    yourMood: 'Ваше настроение',
    partnerMood: 'Настроение партнёра',
    notSelected: 'Не выбрано',
    clickToChange: 'Нажмите чтобы изменить',
    clickForRecommendations: 'Нажмите для рекомендаций',
    rituals: 'Ритуалов',
    messages: 'Сообщений',
    dailyQuestion: '❓ Вопрос дня',
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
    logout: '🚪 Выйти',
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
    couplePulse: '💓 Couple Pulse',
    daysTogether: 'Days Together',
    realTimeMood: 'Real-Time Mood',
    yourMood: 'Your Mood',
    partnerMood: "Partner's Mood",
    notSelected: 'Not selected',
    clickToChange: 'Click to change',
    clickForRecommendations: 'Click for recommendations',
    rituals: 'Rituals',
    messages: 'Messages',
    dailyQuestion: '❓ Question of the Day',
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
    logout: '🚪 Logout',
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
  default: {
    primary: '#ff6b9d',
    secondary: '#6b72ff',
    gradient: ['#ff6b9d', '#f093fb', '#667eea'],
    background: '#0f0f1e',
    card: '#1a1a2e',
    text: '#ffffff'
  },
  ocean: {
    primary: '#00d4ff',
    secondary: '#7c3aed',
    gradient: ['#00d4ff', '#0ea5e9', '#7c3aed'],
    background: '#0c1929',
    card: '#1e3a5f',
    text: '#e0f2fe'
  },
  sunset: {
    primary: '#f97316',
    secondary: '#ec4899',
    gradient: ['#f97316', '#fb923c', '#ec4899'],
    background: '#1a0f1a',
    card: '#2d1b3d',
    text: '#fef3c7'
  },
  forest: {
    primary: '#22c55e',
    secondary: '#16a34a',
    gradient: ['#22c55e', '#4ade80', '#16a34a'],
    background: '#0a1a0f',
    card: '#1b3a24',
    text: '#dcfce7'
  },
  midnight: {
    primary: '#8b5cf6',
    secondary: '#6366f1',
    gradient: ['#8b5cf6', '#a78bfa', '#6366f1'],
    background: '#0a0a1a',
    card: '#1a1a3a',
    text: '#e0e7ff'
  }
};

const DAILY_QUESTIONS = [
  "Что нам больше всего нравится в наших отношениях?",
  "Какое наше самое любимое совместное воспоминание?",
  "Что мы хотели бы улучшить в наших отношениях?",
  "Как мы представляем наше идеальное свидание?",
  "Что заставляет нас чувствовать себя любимыми?",
  "Какая наша любимая черта характера друг в друге?",
  "Что мы больше всего ценим в нашем партнере?",
  "Как мы предпочитаем решать конфликты?",
  "Что для нас значит доверие в отношениях?",
  "Какую роль играет общение в наших отношениях?",
  "Что помогает нам чувствовать глубокую связь?",
  "Какие у нас общие мечты и цели?",
  "Как мы поддерживаем друг друга?",
  "Как мы предпочитаем проявлять любовь?",
  "Что для нас значит качественное время вместе?",
  "Какие наши общие ценности самые важные?",
  "Как мы балансируем личное пространство и время вместе?",
  "Как мы поддерживаем романтику?",
  "Что для нас значит уважение в отношениях?",
  "Как мы празднуем успехи друг друга?",
  "Что помогает нам расти как паре?",
  "Какие традиции мы хотим создать?",
  "Что для нас значит честность?",
  "Как мы справляемся со стрессом вместе?",
  "Что мы ценим в нашей близости?",
  "Как мы поддерживаем друг друга в трудные времена?",
  "Что для нас значит компромисс?",
  "Как мы выражаем благодарность друг другу?",
  "Какие у нас общие интересы?",
  "Как мы поддерживаем интерес друг к другу?",
  "Что для нас значит партнерство?",
  "Как мы решаем финансовые вопросы?",
  "Что мы ценим в нашем чувстве юмора?",
  "Как мы поддерживаем мечты друг друга?",
  "Что для нас значит эмоциональная близость?",
  "Как мы любим проводить свободное время?",
  "Что мы думаем о наших семьях?",
  "Как мы заботимся друг о друге?",
  "Что для нас значит безопасность в отношениях?",
  "Как мы поддерживаем дружбу в наших отношениях?"
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
    
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: false,
      easing: Easing.out(Easing.cubic)
    }).start();
    
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 2000, useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: false })
      ])
    ).start();
    
    return () => { if (socketRef.current) socketRef.current.disconnect(); };
  }, []);

  const scrollToBottom = useCallback(() => {
    if (chatListRef.current) setTimeout(() => chatListRef.current.scrollToEnd({ animated: true }), 100);
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages]);

  const loadSession = async () => {
    try {
      const [saved, days, msgs, strk, sleepData, calEvents, savedTheme, savedLang] = await Promise.all([
        AsyncStorage.getItem('feel_session'),
        AsyncStorage.getItem('daysTogether'),
        AsyncStorage.getItem('totalMessages'),
        AsyncStorage.getItem('ritualStreak'),
        AsyncStorage.getItem('sleepMode'),
        AsyncStorage.getItem('calendarEvents'),
        AsyncStorage.getItem('theme'),
        AsyncStorage.getItem('language')
      ]);
      
      if (saved) {
        const { code, role } = JSON.parse(saved);
        if (code && role) {
          setPairCode(code);
          setUserRole(role);
          if (days) setDaysTogether(parseInt(days));
          if (msgs) setTotalMessages(parseInt(msgs));
          if (strk) setStreak(parseInt(strk));
          if (calEvents) setCalendarEvents(JSON.parse(calEvents));
          if (savedTheme) setCurrentTheme(savedTheme);
          if (savedLang) setLanguage(savedLang);
          
          if (sleepData) {
            const sleep = JSON.parse(sleepData);
            if (sleep.active && new Date(sleep.until) > new Date()) {
              setSleepModeActive(true);
              setSleepActivatedBy(sleep.activatedBy);
              setSleepUntil(sleep.until);
              if (sleep.activatedBy !== role) setShowSleepOverlay(true);
            }
          }
          
          setTimeout(() => {
            setScreen('main');
            initSocket(code, role);
            loadDailyQuestion();
          }, 150);
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
        if (available.length === 0) {
          used.length = 0;
          available = DAILY_QUESTIONS;
        }
        const idx = Math.floor(Math.random() * available.length);
        const qIdx = DAILY_QUESTIONS.indexOf(available[idx]);
        used.push(qIdx);
        
        await AsyncStorage.setItem('usedQuestions', JSON.stringify(used));
        await AsyncStorage.setItem('lastQuestionDate', today);
        setTodaysQuestion(available[idx]);
        await AsyncStorage.setItem('todaysQuestion', available[idx]);
      } else {
        const saved = await AsyncStorage.getItem('todaysQuestion');
        if (saved) setTodaysQuestion(saved);
      }
    } catch (e) { console.error('Question error', e); }
  };

  const initSocket = (code, role) => {
    if (socketRef.current) socketRef.current.disconnect();
    
    const newSocket = io(CONFIG.SERVER_URL, {
      transports: ['websocket', 'poll'],
      reconnection: true,
      reconnectionDelay: 1000,
      timeout: 20000
    });
    socketRef.current = newSocket;
    sentMessageIds.current.clear();
    
    newSocket.on('connect', () => {
      console.log('✅ Socket connected');
      setConnected(true);
      newSocket.emit('join-pair', { pairCode: code.replace('FEEL-', ''), userRole: role });
    });

    newSocket.on('joined', () => {
      console.log('✅ Joined room');
      newSocket.emit('load-messages', { pairCode: code.replace('FEEL-', '') });
      newSocket.emit('get-profiles', { pairCode: code.replace('FEEL-', '') });
    });
    
    newSocket.on('new-message', (msg) => {
      console.log('📩 New message:', msg.id, msg.type);
      setMessages(prev => {
        const exists = prev.some(m => m.id === msg.id);
        if (exists) return prev;
        return [...prev, msg];
      });
      
      if (msg.user_id !== role) {
        newSocket.emit('mark-read', { pairCode: msg.pair_code, messageId: msg.id, reader: role });
      }
      
      if (!messageAnims.current[msg.id]) {
        messageAnims.current[msg.id] = new Animated.Value(0);
        Animated.timing(messageAnims.current[msg.id], { toValue: 1, duration: 300, useNativeDriver: false }).start();
      }
    });
    
    newSocket.on('messages-loaded', (msgs) => {
      console.log('📚 Messages loaded:', msgs?.length);
      setMessages(msgs || []);
    });
    
    newSocket.on('message-read', ({ messageId, reader }) => {
      console.log('📖 Message read:', messageId);
      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, read_by_partner: true } : m
      ));
    });
    
    newSocket.on('status-updated', (data) => {
      console.log('💓 Status updated:', data);
      if (data.user === role) {
        setMyMood(data.value);
      } else {
        setPartnerMood(data.value);
      }
    });
    
    newSocket.on('profiles-loaded', (profiles) => {
      console.log('👥 Profiles loaded:', profiles);
      const me = profiles?.find(p => p.user_id === role);
      const partner = profiles?.find(p => p.user_id !== role);
      if (me) { setMyNickname(me.nickname || 'Я'); setMyAvatarColor(me.avatar_color || '#ff6b9d'); }
      if (partner) { setPartnerNickname(partner.nickname || 'Партнёр'); setPartnerAvatarColor(partner.avatar_color || '#6b72ff'); }
    });
    
    newSocket.on('quiz-updated', (data) => {
      if (!data?.quiz) return;
      const { ans_a, ans_b } = data.quiz;
      if (ans_a && ans_b) {
        setMyAnswer(role === 'M' ? ans_a : ans_b);
        setPartnerAnswer(role === 'M' ? ans_b : ans_a);
      } else {
        if (role === 'M' && ans_a) setMyAnswer(ans_a);
        if (role === 'Ж' && ans_b) setMyAnswer(ans_b);
      }
    });
    
    newSocket.on('peace-updated', (data) => {
      if (data?.active) {
        setPeaceActive(true);
        Alert.alert(t.peaceSent, t.peaceMessage);
      }
    });
    
    newSocket.on('sleep-updated', (data) => {
      if (data.active) {
        setSleepModeActive(true);
        setSleepActivatedBy(data.user);
        setSleepUntil(data.sleepUntil);
        AsyncStorage.setItem('sleepMode', JSON.stringify({ active: true, activatedBy: data.user, until: data.sleepUntil }));
        if (data.user !== role) {
          setShowSleepOverlay(true);
          Alert.alert('🌙 Sleep Mode', 'Partner went to sleep.');
        }
      } else {
        setSleepModeActive(false);
        setSleepActivatedBy(null);
        setSleepUntil(null);
        setShowSleepOverlay(false);
        AsyncStorage.removeItem('sleepMode');
      }
    });
    
    newSocket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      setConnected(false);
    });
  };

  const createPair = async () => {
    try {
      setLoading(true);
      const code = Math.random().toString(36).substring(2, 6).toUpperCase();
      await supabase.from('pairs').insert({ 
        code, gender_a: 'M', gender_b: 'Ж', status_a: null, status_b: null,
        streak: 0, peace: { active: false }, quiz: { question: DAILY_QUESTIONS[0], ans_a: null, ans_b: null }
      });
      
      const fullCode = 'FEEL-' + code;
      await AsyncStorage.setItem('feel_session', JSON.stringify({ code: fullCode, role: 'M' }));
      await AsyncStorage.setItem('relationshipStart', new Date().toISOString());
      
      setUserRole('M');
      setPairCode(fullCode);
      setDaysTogether(1);
      
      setTimeout(() => {
        setScreen('main');
        loadDailyQuestion();
        initSocket(fullCode, 'M');
      }, 200);
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
      
      if (error || !pair) {
        Alert.alert('Error', `Pair "${cleanCode}" not found.`);
        return;
      }
      
      await AsyncStorage.setItem('feel_session', JSON.stringify({ code: fullCode, role: 'Ж' }));
      const start = await AsyncStorage.getItem('relationshipStart');
      if (start) setDaysTogether(Math.max(0, Math.floor((Date.now() - new Date(start)) / 86400000)));
      
      setUserRole('Ж');
      setPairCode(fullCode);
      
      setTimeout(() => {
        setScreen('main');
        loadDailyQuestion();
        initSocket(fullCode, 'Ж');
      }, 200);
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  };

  const sendMessage = (text = null, type = 'text', mediaData = null) => {
    if ((!text || !text.trim()) && !mediaData && type === 'text') return;
    if (sleepModeActive) return;
    if (!socketRef.current) return;
    
    const msgId = Date.now().toString();
    const msg = { 
      id: msgId, 
      pair_code: pairCode.replace('FEEL-', ''), 
      user_id: userRole, 
      nickname: myNickname,
      text: text?.trim() || '',
      type: type,
      mediaUrl: mediaData,
      duration: type === 'voice' ? mediaData?.duration : undefined,
      created_at: new Date().toISOString(), 
      read_by_partner: false
    };
    
    console.log('📤 Sending message:', { ...msg, mediaUrl: mediaData ? '[base64]' : null });
    sentMessageIds.current.add(msgId);
    
    setMessages(prev => {
      const exists = prev.some(m => m.id === msgId);
      if (exists) return prev;
      return [...prev, msg];
    });
    
    socketRef.current.emit('send-message', msg);
    setChatInput('');
    
    setTotalMessages(prev => {
      const n = prev + 1;
      AsyncStorage.setItem('totalMessages', n.toString());
      return n;
    });
  };

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      Alert.alert('Error', 'Please select an image');
      return;
    }
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result;
      sendMessage(null, 'image', base64);
    };
    reader.readAsDataURL(file);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result;
          sendMessage(null, 'voice', {  base64, duration: 0 });
        };
        reader.readAsDataURL(audioBlob);
        
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      Alert.alert('Error', 'Could not access microphone');
      console.error('Recording error:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const playVoiceMessage = (msg) => {
    if (playingMessageId === msg.id) {
      setPlayingMessageId(null);
    } else {
      setPlayingMessageId(msg.id);
      const audio = new Audio(msg.mediaUrl);
      audio.onended = () => setPlayingMessageId(null);
      audio.play();
    }
  };

  const updateMood = (key) => {
    if (!socketRef.current) return;
    setMyMood(key);
    setShowMoodSelector(false);
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
    setAnswerInput('');
    Alert.alert(t.answerSaved, t.waitingPartner);
  };

  const sendPeace = () => {
    if (!socketRef.current) return;
    socketRef.current.emit('peace-request', { pairCode: pairCode.replace('FEEL-', ''), user: userRole });
    setPeaceActive(true);
    Alert.alert(t.peaceSent, t.peaceMessage);
  };

  const toggleSleep = () => {
    if (!socketRef.current) return;
    if (sleepModeActive && sleepActivatedBy === userRole) {
      setSleepModeActive(false);
      setSleepActivatedBy(null);
      setSleepUntil(null);
      setShowSleepOverlay(false);
      AsyncStorage.removeItem('sleepMode');
      socketRef.current.emit('sleep-toggle', { pairCode: pairCode.replace('FEEL-', ''), user: userRole, active: false });
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(6, 0, 0, 0);
      setSleepModeActive(true);
      setSleepActivatedBy(userRole);
      setSleepUntil(tomorrow.toISOString());
      AsyncStorage.setItem('sleepMode', JSON.stringify({ active: true, activatedBy: userRole, until: tomorrow.toISOString() }));
      socketRef.current.emit('sleep-toggle', { pairCode: pairCode.replace('FEEL-', ''), user: userRole, active: true, sleepUntil: tomorrow.toISOString() });
    }
  };

  const syncWithGoogleCalendar = async () => {
    try {
      const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=YOUR_CLIENT_ID&redirect_uri=${encodeURIComponent('https://feel-in.vercel.app/auth/google')}&response_type=token&scope=https://www.googleapis.com/auth/calendar.readonly&access_type=offline`;
      Linking.openURL(googleAuthUrl);
      Alert.alert('📅 Google Calendar', 'Open browser to authorize');
    } catch (e) {
      Alert.alert('Error', 'Could not sync calendar');
    }
  };

  const updateProfile = async () => {
    if (!socketRef.current) return;
    socketRef.current.emit('update-profile', { pairCode: pairCode.replace('FEEL-', ''), user: userRole, nickname: myNickname, avatarColor: myAvatarColor });
    await AsyncStorage.setItem('myNickname', myNickname);
    await AsyncStorage.setItem('myAvatarColor', myAvatarColor);
    setShowProfileModal(false);
    Alert.alert('✅ Profile updated');
  };

  const changeTheme = async (themeName) => {
    setCurrentTheme(themeName);
    await AsyncStorage.setItem('theme', themeName);
  };

  const changeLanguage = async (lang) => {
    setLanguage(lang);
    await AsyncStorage.setItem('language', lang);
  };

  const logout = async () => {
    if (socketRef.current) socketRef.current.disconnect();
    await AsyncStorage.removeItem('feel_session');
    setScreen('welcome');
    setPairCode('');
    setUserRole(null);
    setMessages([]);
    setShowSettings(false);
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
          setSleepModeActive(false);
          setSleepActivatedBy(null);
          setSleepUntil(null);
          setShowSleepOverlay(false);
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

  // WELCOME
  if (screen === 'welcome') {
    return (
      <LinearGradient colors={theme.gradient} style={styles.container}>
        <Animated.View style={[styles.center, { opacity: fadeAnim }]}>
          <Animated.View style={[styles.premiumLogo, { transform: [{ scale: pulseAnim }] }]}>
            <Text style={styles.logoEmoji}>💕</Text>
            <View style={styles.logoGlow} />
          </Animated.View>
          <Text style={styles.premiumTitle}>{t.appTitle}</Text>
          <Text style={styles.premiumSubtitle}>{t.subtitle}</Text>
          <View style={styles.inputContainer}>
            <TextInput style={styles.premiumInput} placeholder={t.enterCode} placeholderTextColor="#8892b0" value={pairCode} onChangeText={setPairCode} autoCapitalize="characters" editable={!loading} />
          </View>
          <TouchableOpacity style={styles.premiumButton} onPress={joinPair} disabled={loading} activeOpacity={0.8}>
            <LinearGradient colors={theme.gradient} style={styles.buttonGradient} start={{x: 0, y: 0}} end={{x: 1, y: 0}}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.premiumButtonText}>{t.login}</Text>}
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.premiumButtonSecondary} onPress={createPair} disabled={loading} activeOpacity={0.8}>
            {loading ? <ActivityIndicator color={theme.primary} /> : <Text style={[styles.premiumButtonSecondaryText, { color: theme.primary }]}>{t.createPair}</Text>}
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>
    );
  }

  // SLEEP OVERLAY
  if (showSleepOverlay) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#0a0a1a' }]}>
        <Animated.View style={[styles.starsContainer, { opacity: starsAnim }]}>
          {[...Array(30)].map((_, i) => (
            <View key={i} style={[styles.star, { left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, width: Math.random() * 4 + 2, height: Math.random() * 4 + 2 }]} />
          ))}
        </Animated.View>
        <View style={styles.sleepOverlayContent}>
          <Animated.Text style={[styles.sleepIcon, { transform: [{ scale: pulseAnim }] }]}>🌙</Animated.Text>
          <Text style={styles.sleepTitle}>Sleep Mode</Text>
          <Text style={styles.sleepText}>{sleepActivatedBy === 'M' ? 'Partner' : 'Partner'} went to sleep</Text>
          <Text style={styles.sleepSubtext}>Chat blocked until 6:00</Text>
        </View>
      </SafeAreaView>
    );
  }

  // MAIN
  return (
    <LinearGradient colors={theme.gradient} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* HEADER */}
        <LinearGradient colors={theme.gradient} style={styles.header} start={{x: 0, y: 0}} end={{x: 1, y: 0}}>
          <View><Text style={styles.headerTitle}>{t.appTitle}</Text><Text style={styles.headerCode}>{pairCode}</Text></View>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={sendPeace} style={styles.headerIconButton}><Text style={styles.headerIcon}>🕊️</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setShowCalendar(true)} style={styles.headerIconButton}><Text style={styles.headerIcon}>📅</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setShowSettings(true)} style={styles.headerIconButton}><Text style={styles.headerIcon}>⚙️</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setShowProfileModal(true)}><Animated.View style={[styles.avatar, { backgroundColor: myAvatarColor, transform: [{ scale: pulseAnim }] }]} /></TouchableOpacity>
            <TouchableOpacity onPress={logout} style={[styles.headerIconButton, styles.headerIconButtonLogout]}><Text style={styles.logoutIcon}>🚪</Text></TouchableOpacity>
          </View>
        </LinearGradient>
        
        {peaceActive && <View style={styles.peaceBanner}><Text style={{ color: '#4ade80', fontWeight: '700' }}>{t.peace}</Text></View>}
        
        <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleImageSelect} />
        
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* COUPLE PULSE - TOP CENTER */}
          <Animated.View style={[styles.pulseCardTop, { transform: [{ scale: pulseAnim }] }]}>
            <LinearGradient colors={theme.gradient} style={styles.pulseGradientTop} start={{x: 0, y: 0}} end={{x: 1, y: 0}}>
              <Text style={styles.pulseHeartTop}>💓</Text>
              <Text style={styles.pulseTextTop}>{t.couplePulse}: {pulseScore}%</Text>
              <Text style={styles.pulseSubtextTop}>{t.daysTogether}: {daysTogether}</Text>
            </LinearGradient>
          </Animated.View>

          {/* REAL-TIME STATUS SECTION */}
          <View style={styles.realTimeStatus}>
            <LinearGradient colors={['rgba(255,107,157,0.15)', 'rgba(102,126,234,0.15)']} style={styles.statusCardTop} start={{x: 0, y: 0}} end={{x: 1, y: 0}}>
              <Text style={styles.statusSectionTitle}>{t.realTimeMood}</Text>
              
              <View style={styles.statusRowTop}>
                <TouchableOpacity style={styles.statusBox} onPress={() => setShowMoodSelector(true)} activeOpacity={0.7}>
                  <Text style={styles.statusLabelTop}>{t.yourMood}</Text>
                  <Animated.View style={[styles.statusEmojiContainer, { transform: [{ scale: pulseAnim }] }]}>
                    <Text style={styles.statusEmojiLarge}>{myMoodData?.emoji || '😐'}</Text>
                  </Animated.View>
                  <Text style={styles.statusName}>{myMoodData ? getMoodLabel(myMoodData) : t.notSelected}</Text>
                  <Text style={styles.statusHint}>{t.clickToChange}</Text>
                </TouchableOpacity>
                
                <View style={styles.statusDividerVertical} />
                
                <TouchableOpacity style={styles.statusBox} onPress={showPartnerRecommendations} activeOpacity={0.7}>
                  <Text style={styles.statusLabelTop}>{t.partnerMood}</Text>
                  <Animated.View style={[styles.statusEmojiContainer, { transform: [{ scale: pulseAnim }] }]}>
                    <Text style={styles.statusEmojiLarge}>{partnerMoodData?.emoji || '😐'}</Text>
                  </Animated.View>
                  <Text style={styles.statusName}>{partnerMoodData ? getMoodLabel(partnerMoodData) : t.notSelected}</Text>
                  <Text style={styles.statusHint}>{t.clickForRecommendations}</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>

          {/* STATS */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: theme.card + '80' }]}><Text style={[styles.statValue, { color: theme.primary }]}>{daysTogether}</Text><Text style={styles.statLabel}>{t.daysTogether}</Text></View>
            <View style={[styles.statCard, { backgroundColor: theme.card + '80' }]}><Text style={[styles.statValue, { color: theme.primary }]}>{streak}</Text><Text style={styles.statLabel}>{t.rituals}</Text></View>
            <View style={[styles.statCard, { backgroundColor: theme.card + '80' }]}><Text style={[styles.statValue, { color: theme.primary }]}>{totalMessages}</Text><Text style={styles.statLabel}>{t.messages}</Text></View>
          </View>

          {/* DAILY QUESTION */}
          {todaysQuestion && (
            <View style={[styles.questionCard, { backgroundColor: theme.card + '80' }]}>
              <Text style={styles.questionTitle}>{t.dailyQuestion}</Text>
              <Text style={styles.questionText}>{todaysQuestion}</Text>
              {!myAnswer ? (
                <View>
                  <TextInput style={[styles.answerInput, { backgroundColor: theme.background + '80' }]} placeholder={t.yourAnswer} placeholderTextColor="#8892b0" value={answerInput} onChangeText={setAnswerInput} multiline numberOfLines={3} />
                  <TouchableOpacity style={[styles.answerBtn, { backgroundColor: theme.secondary }]} onPress={submitAnswer}><Text style={styles.answerBtnText}>{t.sendAnswer}</Text></TouchableOpacity>
                </View>
              ) : partnerAnswer ? (
                <View style={styles.answersRevealed}>
                  <View style={[styles.answerBox, { backgroundColor: theme.background + '80' }]}><Text style={styles.answerLabel}>{language === 'ru' ? 'Ваш ответ:' : 'Your answer:'}</Text><Text style={styles.answerValue}>{myAnswer}</Text></View>
                  <View style={[styles.answerBox, { backgroundColor: theme.background + '80' }]}><Text style={styles.answerLabel}>{language === 'ru' ? 'Ответ партнёра:' : "Partner's answer:"}</Text><Text style={styles.answerValue}>{partnerAnswer}</Text></View>
                </View>
              ) : (
                <View style={styles.waitingAnswer}><Text style={styles.waitingText}>⏳ {language === 'ru' ? 'Ваш ответ сохранен' : 'Answer saved'}</Text><Text style={styles.waitingSubtext}>{t.waitingPartner}</Text></View>
              )}
            </View>
          )}

          {/* CHAT WITH MEDIA */}
          <View style={styles.chatSection}>
            <View style={styles.chatHeader}>
              <Text style={styles.sectionTitle}>{t.chat}</Text>
              {sleepModeActive && <View style={styles.sleepBadge}><Text style={styles.sleepBadgeText}>{t.sleepMode}</Text></View>}
            </View>
            <View style={[styles.chatContainer, { backgroundColor: theme.background + '40' }]}>
              <FlatList 
                ref={chatListRef} 
                data={messages} 
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                  if (!messageAnims.current[item.id]) messageAnims.current[item.id] = new Animated.Value(0);
                  
                  const isMyMessage = item.user_id === userRole;
                  
                  return (
                    <Animated.View style={[styles.messageBubble, isMyMessage ? styles.messageMine : styles.messagePartner, { opacity: messageAnims.current[item.id], backgroundColor: isMyMessage ? theme.primary : theme.card }]}>
                      <Text style={styles.messageNickname}>{item.nickname || (isMyMessage ? myNickname : partnerNickname)}</Text>
                      
                      {item.type === 'image' && item.mediaUrl && (
                        <Image source={{ uri: item.mediaUrl }} style={styles.messageImage} resizeMode="cover" />
                      )}
                      
                      {item.type === 'voice' && (
                        <TouchableOpacity 
                          style={[styles.voiceMessage, playingMessageId === item.id && styles.voiceMessagePlaying]}
                          onPress={() => playVoiceMessage(item)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.voiceIcon}>{playingMessageId === item.id ? '⏸️' : '▶️'}</Text>
                          <View style={styles.voiceWaveform}>
                            {[...Array(20)].map((_, i) => (
                              <Animated.View key={i} style={[styles.waveBar, playingMessageId === item.id && { animation: 'wave 0.5s ease-in-out infinite', animationDelay: `${i * 0.05}s` }]} />
                            ))}
                          </View>
                          <Text style={styles.voiceDuration}>0:05</Text>
                        </TouchableOpacity>
                      )}
                      
                      {item.text && item.type === 'text' && <Text style={styles.messageText}>{item.text}</Text>}
                      
                      <View style={styles.messageFooter}>
                        <Text style={styles.messageTime}>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                        {isMyMessage && (
                          <Text style={styles.readStatus}>
                            {item.read_by_partner === true ? '❤️❤️' : item.read_by_partner === false ? '🤍' : '✓'}
                          </Text>
                        )}
                      </View>
                    </Animated.View>
                  );
                }}
                style={styles.chatList} 
                contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end', padding: 8 }}
              />
            </View>
            
            <KeyboardAvoidingView behavior={IS_WEB ? 'height' : 'padding'}>
              <View style={styles.inputRow}>
                <TouchableOpacity onPress={() => fileInputRef.current?.click()} style={styles.attachButton}>
                  <Text style={styles.attachIcon}>📎</Text>
                </TouchableOpacity>
                
                <TextInput 
                  style={[styles.chatInput, sleepModeActive && styles.chatInputDisabled, { backgroundColor: theme.background + '80' }]}
                  placeholder={sleepModeActive ? t.chatBlocked : t.messagePlaceholder}
                  placeholderTextColor={sleepModeActive ? "#666" : "#8892b0"}
                  value={chatInput} 
                  onChangeText={setChatInput} 
                  onSubmitEditing={() => sendMessage()} 
                  returnKeyType="send" 
                  editable={!sleepModeActive}
                />
                
                <TouchableOpacity 
                  style={[styles.recordButton, isRecording && styles.recordButtonActive]} 
                  onPressIn={startRecording}
                  onPressOut={stopRecording}
                  disabled={sleepModeActive}
                  activeOpacity={0.7}
                >
                  <Text style={styles.recordIcon}>{isRecording ? '⏹️' : '🎤'}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.sendBtn, sleepModeActive && styles.sendBtnDisabled, { backgroundColor: theme.primary }]} 
                  onPress={() => sendMessage()} 
                  disabled={sleepModeActive}
                >
                  <Text style={styles.sendText}>➤</Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
            
            <TouchableOpacity style={[styles.sleepButton, sleepModeActive && sleepActivatedBy === userRole && styles.sleepButtonActive, { backgroundColor: theme.background + '80' }]} onPress={toggleSleep}>
              <Text style={styles.sleepButtonText}>{sleepModeActive && sleepActivatedBy === userRole ? t.wakeUp : t.sleepNight}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* MOOD SELECTOR MODAL */}
      <Modal visible={showMoodSelector} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.moodModalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{t.howAreYou}</Text>
            <View style={styles.moodGrid}>
              {MOODS.map((mood) => (
                <TouchableOpacity key={mood.key} style={[styles.moodOption, myMood === mood.key && { backgroundColor: mood.color, borderColor: '#fff', borderWidth: 2 }]} onPress={() => updateMood(mood.key)}>
                  <Text style={styles.moodOptionEmoji}>{mood.emoji}</Text>
                  <Text style={[styles.moodOptionLabel, myMood === mood.key && { color: '#fff' }]}>{getMoodLabel(mood)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity onPress={() => setShowMoodSelector(false)} style={{ marginTop: 20 }}><Text style={{ color: '#8892b0' }}>{t.close}</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* RECOMMENDATIONS MODAL */}
      <Modal visible={showRecommendations} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.recommendationModalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{t.recommendations}</Text>
            <View style={styles.partnerMoodDisplay}>
              <Text style={styles.partnerMoodEmoji}>{partnerMoodData?.emoji}</Text>
              <Text style={[styles.partnerMoodName, { color: theme.text }]}>{partnerMoodData ? getMoodLabel(partnerMoodData) : ''}</Text>
            </View>
            <Text style={[styles.recommendationTitle, { color: theme.secondary }]}>{t.whatToDo}</Text>
            <View style={styles.recommendationsList}>
              {partnerMoodData?.recommendations.map((rec, idx) => (
                <View key={idx} style={styles.recommendationItem}>
                  <Text style={styles.recommendationDot}>•</Text>
                  <Text style={styles.recommendationText}>{rec}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity onPress={() => setShowRecommendations(false)} style={styles.closeBtn}><Text style={styles.closeBtnText}>{t.close}</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* CALENDAR MODAL */}
      <Modal visible={showCalendar} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.calendarModalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{t.calendar}</Text>
            <Text style={[styles.calendarSubtext, { color: '#8892b0' }]}>{t.syncGoogle}</Text>
            <TouchableOpacity style={[styles.calendarSyncBtn, { backgroundColor: '#4285f4' }]} onPress={syncWithGoogleCalendar}>
              <Text style={styles.calendarSyncText}>{t.syncGoogle}</Text>
            </TouchableOpacity>
            <View style={styles.eventsList}>
              <Text style={[styles.eventsTitle, { color: theme.text }]}>{t.upcomingEvents}</Text>
              {calendarEvents.length === 0 ? (
                <Text style={[styles.noEvents, { color: '#8892b0' }]}>{t.noEvents}</Text>
              ) : (
                calendarEvents.slice(0, 5).map((event, idx) => (
                  <View key={idx} style={styles.eventItem}>
                    <Text style={[styles.eventTitle, { color: theme.text }]}>{event.title}</Text>
                    <Text style={styles.eventDate}>{new Date(event.date).toLocaleString()}</Text>
                  </View>
                ))
              )}
            </View>
            <TouchableOpacity onPress={() => setShowCalendar(false)} style={styles.closeBtn}><Text style={styles.closeBtnText}>{t.close}</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* SETTINGS MODAL */}
      <Modal visible={showSettings} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.settingsModal, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{t.settings}</Text>
            
            <Text style={[styles.settingLabel, { color: theme.text }]}>{t.theme}</Text>
            <View style={styles.themeRow}>
              {Object.keys(THEMES).map(themeName => (
                <TouchableOpacity 
                  key={themeName} 
                  style={[styles.themeOption, currentTheme === themeName && { borderColor: theme.primary, borderWidth: 2 }]}
                  onPress={() => changeTheme(themeName)}
                >
                  <LinearGradient colors={THEMES[themeName].gradient} style={styles.themePreview} start={{x: 0, y: 0}} end={{x: 1, y: 0}} />
                  <Text style={[styles.themeLabel, { color: theme.text }]}>{themeName}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <Text style={[styles.settingLabel, { color: theme.text }]}>{t.language}</Text>
            <View style={styles.languageRow}>
              <TouchableOpacity 
                style={[styles.langOption, language === 'ru' && { backgroundColor: theme.primary }]} 
                onPress={() => changeLanguage('ru')}
              >
                <Text style={[styles.langText, language === 'ru' && { color: '#fff' }]}>🇷🇺 {t.russian}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.langOption, language === 'en' && { backgroundColor: theme.primary }]} 
                onPress={() => changeLanguage('en')}
              >
                <Text style={[styles.langText, language === 'en' && { color: '#fff' }]}>🇬 {t.english}</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity style={[styles.settingsBtn, { backgroundColor: theme.background + '80' }]} onPress={() => setShowSettings(false)}>
              <Text style={[styles.settingsBtnText, { color: theme.text }]}>{t.close}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* PROFILE MODAL */}
      <Modal visible={showProfileModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{t.profile}</Text>
            <TextInput style={[styles.modalInput, { backgroundColor: theme.background + '80', color: theme.text }]} placeholder={t.nickname} placeholderTextColor="#8892b0" value={myNickname} onChangeText={setMyNickname} maxLength={20} />
            <Text style={[styles.modalLabel, { color: '#8892b0' }]}>{t.avatarColor}</Text>
            <View style={styles.colorRow}>
              {AVATAR_COLORS.map(color => (
                <TouchableOpacity key={color} style={[styles.colorBtn, { backgroundColor: color, borderColor: myAvatarColor === color ? '#fff' : 'transparent', borderWidth: 2 }]} onPress={() => setMyAvatarColor(color)} />
              ))}
            </View>
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.primary }]} onPress={updateProfile}><Text style={styles.modalBtnText}>{t.save}</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setShowProfileModal(false)}><Text style={{ color: '#8892b0', marginTop: 12 }}>{t.cancel}</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 10 },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#fff' },
  headerCode: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  headerRight: { flexDirection: 'row', alignItems: 'center', flexWrap: 'nowrap' },
  headerIconButton: { marginRight: 6, padding: 4 },
  headerIconButtonLogout: { marginLeft: 2 },
  headerIcon: { fontSize: 24 },
  logoutIcon: { fontSize: 22 },
  avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  
  scroll: { flex: 1 },
  peaceBanner: { backgroundColor: 'rgba(74, 222, 128, 0.15)', padding: 14, marginHorizontal: 16, marginTop: 12, borderRadius: 12, alignItems: 'center' },
  
  pulseCardTop: { marginHorizontal: 16, marginTop: 8, marginBottom: 8, borderRadius: 20, overflow: 'hidden' },
  pulseGradientTop: { padding: 20, alignItems: 'center' },
  pulseHeartTop: { fontSize: 48, marginBottom: 8 },
  pulseTextTop: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  pulseSubtextTop: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  
  realTimeStatus: { margin: 16, marginTop: 0 },
  statusCardTop: { borderRadius: 24, padding: 24, borderWidth: 1, borderColor: 'rgba(255,107,157,0.3)' },
  statusSectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 20, textAlign: 'center' },
  statusRowTop: { flexDirection: 'row' },
  statusBox: { flex: 1, alignItems: 'center', padding: 12 },
  statusLabelTop: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 12, textAlign: 'center' },
  statusEmojiContainer: { padding: 8, marginBottom: 8 },
  statusEmojiLarge: { fontSize: 48 },
  statusName: { fontSize: 16, color: '#fff', fontWeight: '600', marginBottom: 6 },
  statusHint: { fontSize: 11, color: '#64ffda', textAlign: 'center' },
  statusDividerVertical: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 12 },
  
  moodModalContent: { backgroundColor: '#1a1a2e', padding: 32, borderRadius: 24, width: '90%', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', maxHeight: '85%' },
  moodGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 12 },
  moodOption: { width: '30%', backgroundColor: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 14, margin: '1.2%', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  moodOptionEmoji: { fontSize: 32, marginBottom: 6 },
  moodOptionLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
  
  recommendationModalContent: { backgroundColor: '#1a1a2e', padding: 32, borderRadius: 24, width: '90%', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  partnerMoodDisplay: { alignItems: 'center', marginVertical: 16 },
  partnerMoodEmoji: { fontSize: 56 },
  partnerMoodName: { fontSize: 20, color: '#fff', fontWeight: '600', marginTop: 8 },
  recommendationTitle: { fontSize: 16, color: '#64ffda', fontWeight: '600', marginBottom: 16, textAlign: 'center' },
  recommendationsList: { width: '100%', paddingHorizontal: 8 },
  recommendationItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, padding: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12 },
  recommendationDot: { fontSize: 20, color: '#fbbf24', marginRight: 12, marginTop: -2 },
  recommendationText: { flex: 1, fontSize: 15, color: '#ccd6f6', lineHeight: 20 },
  closeBtn: { marginTop: 20, paddingVertical: 12, paddingHorizontal: 32, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12 },
  closeBtnText: { color: '#fff', fontWeight: '600' },
  
  calendarModalContent: { backgroundColor: '#1a1a2e', padding: 32, borderRadius: 24, width: '90%', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', maxHeight: '80%' },
  calendarSubtext: { fontSize: 14, color: '#8892b0', marginBottom: 20, textAlign: 'center' },
  calendarSyncBtn: { backgroundColor: '#4285f4', padding: 16, borderRadius: 12, marginBottom: 20, width: '100%', alignItems: 'center' },
  calendarSyncText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  eventsList: { width: '100%', maxHeight: 200 },
  eventsTitle: { fontSize: 16, color: '#fff', fontWeight: '600', marginBottom: 12 },
  noEvents: { color: '#8892b0', textAlign: 'center', padding: 20 },
  eventItem: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 10, marginBottom: 8 },
  eventTitle: { color: '#fff', fontWeight: '600', marginBottom: 4 },
  eventDate: { color: '#8892b0', fontSize: 12 },
  
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 16, marginBottom: 16 },
  statCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, alignItems: 'center', flex: 1, marginHorizontal: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  statValue: { fontSize: 28, fontWeight: 'bold', color: '#ff6b9d', marginBottom: 6 },
  statLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
  questionCard: { backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 16, marginBottom: 16, padding: 24, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  questionTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 16, textAlign: 'center' },
  questionText: { fontSize: 17, color: '#ccd6f6', marginBottom: 20, textAlign: 'center', fontStyle: 'italic', lineHeight: 24 },
  answerInput: { backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff', padding: 16, borderRadius: 12, minHeight: 100, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  answerBtn: { backgroundColor: '#64ffda', padding: 16, borderRadius: 12, alignItems: 'center' },
  answerBtnText: { color: '#1a1a2e', fontWeight: 'bold', fontSize: 16 },
  answersRevealed: { gap: 12 },
  answerBox: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  answerLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 8 },
  answerValue: { fontSize: 16, color: '#fff', lineHeight: 22 },
  waitingAnswer: { alignItems: 'center', padding: 20 },
  waitingText: { fontSize: 16, color: '#64ffda', fontWeight: '600', marginBottom: 8 },
  waitingSubtext: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  chatSection: { marginHorizontal: 16, marginBottom: 16 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  sleepBadge: { backgroundColor: 'rgba(102,126,234,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(102,126,234,0.3)' },
  sleepBadgeText: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  chatContainer: { height: 320, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  chatList: { flex: 1 },
  messageBubble: { maxWidth: '75%', padding: 14, borderRadius: 16, marginBottom: 10 },
  messageMine: { backgroundColor: '#ff6b9d', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  messagePartner: { backgroundColor: 'rgba(255,255,255,0.1)', alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  messageImage: { width: 200, height: 200, borderRadius: 12, marginBottom: 8, alignSelf: 'flex-start' },
  voiceMessage: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', padding: 12, borderRadius: 12, marginBottom: 8, minWidth: 150 },
  voiceMessagePlaying: { backgroundColor: 'rgba(102,126,234,0.3)' },
  voiceIcon: { fontSize: 24, marginRight: 12 },
  voiceWaveform: { flexDirection: 'row', alignItems: 'center', flex: 1, height: 30, paddingHorizontal: 8 },
  waveBar: { width: 3, height: 15, backgroundColor: '#fff', marginHorizontal: 1, borderRadius: 2 },
  voiceDuration: { color: '#fff', fontSize: 12, marginLeft: 8 },
  messageNickname: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 6, fontWeight: '600' },
  messageText: { fontSize: 15, color: '#fff', marginBottom: 6, lineHeight: 20 },
  messageFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  messageTime: { fontSize: 10, color: 'rgba(255,255,255,0.6)' },
  readStatus: { fontSize: 14, marginLeft: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  attachButton: { padding: 10, marginRight: 4 },
  attachIcon: { fontSize: 24 },
  chatInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff', padding: 14, borderRadius: 24, marginRight: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  chatInputDisabled: { backgroundColor: 'rgba(255,255,255,0.02)', color: '#666', borderColor: 'rgba(255,255,255,0.05)' },
  recordButton: { width: 44, height: 44, backgroundColor: '#ef4444', borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 4 },
  recordButtonActive: { backgroundColor: '#dc2626', transform: [{ scale: 1.1 }] },
  recordIcon: { fontSize: 20 },
  sendBtn: { width: 44, height: 44, backgroundColor: '#ff6b9d', borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: '#444' },
  sendText: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  sleepButton: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  sleepButtonActive: { backgroundColor: 'rgba(102,126,234,0.2)', borderColor: 'rgba(102,126,234,0.4)' },
  sleepButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#1a1a2e', padding: 32, borderRadius: 24, width: '85%', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  settingsModal: { backgroundColor: '#1a1a2e', padding: 32, borderRadius: 24, width: '85%', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 24 },
  settingLabel: { fontSize: 16, fontWeight: '600', marginBottom: 12, alignSelf: 'flex-start', width: '100%' },
  modalInput: { width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff', padding: 14, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalLabel: { fontSize: 14, color: '#8892b0', marginBottom: 12, alignSelf: 'flex-start', width: '100%' },
  modalBtn: { backgroundColor: '#ff6b9d', paddingHorizontal: 36, paddingVertical: 14, borderRadius: 12 },
  modalBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  colorRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  colorBtn: { width: 40, height: 40, borderRadius: 20 },
  settingsBtn: { width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 12, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  settingsBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  
  themeRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20, flexWrap: 'wrap' },
  themeOption: { width: '30%', borderRadius: 12, padding: 8, alignItems: 'center', marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  themePreview: { width: '100%', height: 40, borderRadius: 8, marginBottom: 6 },
  themeLabel: { fontSize: 12, textAlign: 'center' },
  languageRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  langOption: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  langText: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  
  starsContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  star: { position: 'absolute', backgroundColor: '#fff', borderRadius: 50 },
  sleepOverlayContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  sleepIcon: { fontSize: 96, marginBottom: 32 },
  sleepTitle: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 16 },
  sleepText: { fontSize: 20, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginBottom: 12 },
  sleepSubtext: { fontSize: 16, color: '#667eea', textAlign: 'center' }
});