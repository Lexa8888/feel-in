import { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Animated, Alert } from 'react-native';
import io from 'socket.io-client';
import axios from 'axios';
import { ThemeProvider, useTheme } from './useTheme';
import { registerForPushNotifications, scheduleDailyReminder, cancelDailyReminder } from './pushNotificationService';
import './web.css';

const SERVER_URL = 'https://feel-in.onrender.com';

const TRANSLATIONS = {
  ru: {
    appName: 'Feel in', tagline: 'Чувствуйте друг друга на расстоянии ✨',
    footer: 'Feel in — пространство для ваших отношений',
    createPair: '✨ Создать пару', orJoin: 'или присоединиться',
    partnerCode: 'Код партнёра (напр. FEEL-ABCD)',
    partnerM: '👨 Партнёр М', partnerF: '👩 Партнёр Ж',
    joinPair: '🚀 Войти в пару', loading: '⏳ Загрузка...',
    statusToday: '🔋 Состояние сегодня',
    hard: 'Тяжело', normal: 'Нормально', good: 'Хорошо', excellent: 'Отлично',
    my: '👤 Моё:', partner: '💕 Партнёр:',
    ritualDay: '❤️ Ритуал дня',
    ritualText: 'Напиши 1 комплимент или «спасибо» партнёру',
    ritualPlaceholder: 'Напиши что-то приятное...',
    ritualDone: '✓ Ритуал выполнен сегодня!',
    sendRitual: '💌 Отправить', completed: '✓ Выполнено',
    streak: '🔥 Streak: {days} дней',
    peaceButton: '🤝 Кнопка "Мир"',
    sendPeace: '🕊️ Отправить сигнал мира', waiting: '⏳ Ожидание...',
    peaceWants: '✨ Партнёр хочет помириться', peaceAccept: 'Нажмите, чтобы принять',
    diary: '📝 Дневник благодарности',
    diaryPlaceholder: 'За что благодарен(на) сегодня?',
    addDiary: '💫 Добавить запись', noDiary: '✨ Пока нет записей. Начни первым!',
    me: '👤 Я', partnerDiary: '💕 Партнёр',
    quiz: '❓ Викторина "Мы"', quizLoading: 'Загрузка вопроса...',
    quizAnswersOpen: '✨ Ответы открыты!',
    quizMatch: '🎉 Вы совпали!', quizNoMatch: '💙 Разные взгляды — это тоже круто',
    quizWaiting: '⏳ Ожидаем ответ партнёра...',
    answerAccepted: '✅ Ответ принят', waitingPartner: 'Ждём ответ партнёра...',
    pairCreated: '✨ Пара создана!', yourCode: 'Твой код: {code}',
    error: 'Ошибка', checkInternet: 'Проверь подключение к интернету',
    attention: 'Внимание', enterCode: 'Введи код партнёра',
    welcome: '🎉 Добро пожаловать!', inPair: 'Вы в паре!', codeInvalid: 'Код неверный',
    statusUpdated: '🔋 Статус обновлён', yourMood: 'Твоё настроение: {mood}',
    ritualGreat: '🎉 Отлично!', ritualComplete: 'Ритуал выполнен! Streak растёт 🔥',
    diaryAdded: '💫 Запись добавлена', thanksSincerity: 'Спасибо за искренность!',
    peaceSent: '🕊️ Сигнал отправлен', partnerNotified: 'Партнёр получит уведомление',
    writeCompliment: 'Сначала напиши комплимент!',
    language: '🌐 Язык', russian: 'Русский', english: 'English',
    leavePair: '🚪 Выйти из пары', confirmLeave: 'Точно выйти из пары?',
    selectRole: '⚠️ Выбери роль (М или Ж)',
    theme: '🌓 Тема',
  },
  en: {
    appName: 'Feel in', tagline: 'Feel each other from afar ✨',
    footer: 'Feel in — space for your relationship',
    createPair: '✨ Create Pair', orJoin: 'or join',
    partnerCode: 'Partner code (e.g. FEEL-ABCD)',
    partnerM: '👨 Partner M', partnerF: '👩 Partner F',
    joinPair: '🚀 Join Pair', loading: '⏳ Loading...',
    statusToday: '🔋 Status Today',
    hard: 'Hard', normal: 'Normal', good: 'Good', excellent: 'Excellent',
    my: '👤 Mine:', partner: '💕 Partner:',
    ritualDay: '❤️ Daily Ritual',
    ritualText: 'Write 1 compliment or "thank you" to your partner',
    ritualPlaceholder: 'Write something nice...',
    ritualDone: '✓ Ritual completed today!',
    sendRitual: '💌 Send', completed: '✓ Completed',
    streak: '🔥 Streak: {days} days',
    peaceButton: '🤝 Peace Button',
    sendPeace: '🕊️ Send Peace Signal', waiting: '⏳ Waiting...',
    peaceWants: '✨ Partner wants to make peace', peaceAccept: 'Click to accept',
    diary: '📝 Gratitude Diary',
    diaryPlaceholder: 'What are you grateful for today?',
    addDiary: '💫 Add Entry', noDiary: '✨ No entries yet. Be the first!',
    me: '👤 Me', partnerDiary: '💕 Partner',
    quiz: '❓ Quiz "Us"', quizLoading: 'Loading question...',
    quizAnswersOpen: '✨ Answers Revealed!',
    quizMatch: '🎉 You Matched!', quizNoMatch: '💙 Different views are cool too',
    quizWaiting: '⏳ Waiting for partner\'s answer...',
    answerAccepted: '✅ Answer Accepted', waitingPartner: 'Waiting for partner\'s answer...',
    pairCreated: '✨ Pair Created!', yourCode: 'Your code: {code}',
    error: 'Error', checkInternet: 'Check your internet connection',
    attention: 'Attention', enterCode: 'Enter partner code',
    welcome: '🎉 Welcome!', inPair: 'You\'re in a pair!', codeInvalid: 'Invalid code',
    statusUpdated: '🔋 Status Updated', yourMood: 'Your mood: {mood}',
    ritualGreat: '🎉 Great!', ritualComplete: 'Ritual complete! Streak grows 🔥',
    diaryAdded: '💫 Entry Added', thanksSincerity: 'Thanks for your sincerity!',
    peaceSent: '🕊️ Signal Sent', partnerNotified: 'Partner will be notified',
    writeCompliment: 'Write a compliment first!',
    language: '🌐 Language', russian: 'Русский', english: 'English',
    leavePair: '🚪 Leave Pair', confirmLeave: 'Are you sure you want to leave?',
    selectRole: '⚠️ Please select a role (M or F)',
    theme: '🌓 Theme',
  },
};

const QUIZ_QUESTIONS = {
  ru: [
    { q: "Что важнее в отношениях?", a1: "Доверие", a2: "Страсть" },
    { q: "Как проявляете любовь?", a1: "Слова", a2: "Действия" },
    { q: "Кто первый мирится?", a1: "Я", a2: "Партнёр" },
    { q: "Важна ли романтика?", a1: "Очень", a2: "Не особо" },
    { q: "Как проводите время?", a1: "Вместе", a2: "Раздельно" },
  ],
  en: [
    { q: "What's more important in relationships?", a1: "Trust", a2: "Passion" },
    { q: "How do you show love?", a1: "Words", a2: "Actions" },
    { q: "Who makes peace first?", a1: "Me", a2: "Partner" },
    { q: "Is romance important?", a1: "Very much", a2: "Not really" },
    { q: "How do you spend time?", a1: "Together", a2: "Separately" },
  ],
};

const getTodaysQuizQuestion = (lang) => {
  const today = new Date().toISOString().split('T')[0];
  const dayIndex = Math.floor(new Date(today).getTime() / (1000 * 60 * 60 * 24));
  const questionIndex = dayIndex % QUIZ_QUESTIONS[lang].length;
  return QUIZ_QUESTIONS[lang][questionIndex];
};

let toastContainer = null;
const initToastContainer = () => {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
};

let lastNotificationTime = 0;
let lastNotificationText = '';

const showNotification = (title, body) => {
  const now = Date.now();
  const text = `${title} - ${body}`;
  if (now - lastNotificationTime < 2000 && text === lastNotificationText) return;
  lastNotificationTime = now;
  lastNotificationText = text;
  
  initToastContainer();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<strong>${title}</strong><br>${body}`;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('hiding');
    setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
  }, 3000);
};

function AppContent() {
  const { theme, toggleTheme } = useTheme();
  const COLORS = theme; 
  
  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg, minHeight: '100vh', width: '100%' },
    scrollView: { flex: 1, width: '100%' },
    header: { alignItems: 'center', marginBottom: 30, paddingTop: 50, width: '100%' },
    headerSmall: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, width: '100%' },
    langBtn: { padding: 10, borderRadius: 8, backgroundColor: COLORS.cardBorder, marginTop: 15 },
    langBtnSmall: { padding: 8, borderRadius: 8, backgroundColor: COLORS.cardBorder },
    leaveBtn: { padding: 8, borderRadius: 8, backgroundColor: 'rgba(255,68,68,0.2)', borderWidth: 1, borderColor: '#FF4444' },
    leaveText: { color: '#FF4444', fontSize: 12, fontWeight: '600' },
    langText: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
    langTextSmall: { color: COLORS.text, fontSize: 12, fontWeight: '600' },
    logo: { fontSize: 48, fontWeight: '900', color: COLORS.text, textAlign: 'center', letterSpacing: 3, marginBottom: 10 },
    subtitle: { fontSize: 16, color: COLORS.textDim, textAlign: 'center', marginTop: 8 },
    footer: { textAlign: 'center', color: COLORS.textDim, marginTop: 30, fontSize: 14, paddingBottom: 20 },
    card: { backgroundColor: COLORS.card, padding: 20, borderRadius: 20, borderWidth: 1, borderColor: COLORS.cardBorder, width: '100%' },
    cardText: { color: COLORS.text, fontSize: 16, marginBottom: 15, lineHeight: 22 },
    section: { marginBottom: 25, paddingHorizontal: 20, width: '100%', alignItems: 'center' },
    sectionTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 12, width: '100%' },
    
    button: { paddingVertical: 16, paddingHorizontal: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', minWidth: 280, width: '100%' },
    buttonText: { color: '#fff', fontWeight: '700', fontSize: 16, textAlign: 'center' },
    buttonDisabled: { opacity: 0.5 },
    
    btnPrimary: { backgroundColor: '#FF6B6B' },
    btnSecondary: { backgroundColor: '#4ECDC4' },
    btnSuccess: { backgroundColor: '#4CAF50' },
    btnAccent: { backgroundColor: '#FFE66D' },
    btnPeace: { backgroundColor: '#2D4A3E' },
    
    input: { backgroundColor: COLORS.inputBg, borderWidth: 1, borderColor: COLORS.cardBorder,
      padding: 16, borderRadius: 12, color: COLORS.text, fontSize: 16, marginBottom: 12, width: '100%' },
    statusGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, width: '100%' },
    statusBtn: { alignItems: 'center', flex: 1, padding: 12, marginHorizontal: 4, borderRadius: 12, backgroundColor: COLORS.cardBorder },
    statusEmoji: { fontSize: 36, marginBottom: 4, fontWeight: '700' },
    statusLabel: { color: COLORS.textDim, fontSize: 11, textAlign: 'center' },
    statusCard: { backgroundColor: COLORS.card, padding: 15, borderRadius: 12, borderWidth: 1, borderColor: COLORS.cardBorder, width: '100%' },
    statusHint: { color: COLORS.textDim, fontSize: 14, marginVertical: 5 },
    divider: { color: COLORS.textDim, marginVertical: 15, textAlign: 'center', fontSize: 14 },
    roleSelector: { flexDirection: 'row', gap: 10, marginBottom: 12, width: '100%' },
    roleBtn: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: COLORS.cardBorder, alignItems: 'center', borderWidth: 1, borderColor: COLORS.cardBorder },
    roleBtnActive: { backgroundColor: '#FF6B6B', borderColor: '#FF6B6B' },
    roleText: { color: COLORS.textDim, fontSize: 13 },
    roleTextActive: { color: '#fff', fontWeight: '700' },
    streakBadge: { backgroundColor: 'rgba(255,179,71,0.15)', padding: 10, borderRadius: 10, alignItems: 'center', marginTop: 12, borderWidth: 1, borderColor: 'rgba(255,179,71,0.3)', width: '100%' },
    streakText: { color: '#FFB347', fontWeight: '700', fontSize: 14 },
    ritualCompleted: { backgroundColor: 'rgba(76,175,80,0.15)', padding: 15, borderRadius: 12, alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: 'rgba(76,175,80,0.3)', width: '100%' },
    ritualCompletedText: { color: '#4CAF50', fontWeight: '700', fontSize: 15 },
    peaceNotification: { backgroundColor: 'rgba(76,175,80,0.15)', padding: 12, borderRadius: 10, marginTop: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(76,175,80,0.3)', width: '100%' },
    peaceText: { color: '#4CAF50', fontWeight: '700', fontSize: 15 },
    peaceSubtext: { color: COLORS.textDim, fontSize: 12, marginTop: 2 },
    diaryList: { marginTop: 12, width: '100%' },
    diaryItem: { backgroundColor: 'rgba(78,205,196,0.15)', padding: 12, borderRadius: 10, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: '#4ECDC4', width: '100%' },
    diaryBy: { color: '#FFE66D', fontSize: 12, marginBottom: 4, fontWeight: '600' },
    diaryText: { color: COLORS.text, fontSize: 14 },
    emptyText: { color: COLORS.textDim, textAlign: 'center', fontStyle: 'italic', padding: 25, fontSize: 15 },
    quizOptions: { flexDirection: 'row', gap: 10, marginTop: 10, width: '100%' },
    quizBtn: { flex: 1, backgroundColor: COLORS.cardBorder, padding: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: COLORS.cardBorder },
    quizResult: { alignItems: 'center', marginTop: 10, width: '100%' },
    quizResultText: { color: '#FFE66D', fontWeight: '700', fontSize: 16 },
    quizMatch: { color: COLORS.text, marginTop: 5, textAlign: 'center' },
    quizWaiting: { color: COLORS.textDim, textAlign: 'center', marginTop: 10, fontStyle: 'italic', fontSize: 14 },
  });

  const [lang, setLang] = useState(() => localStorage.getItem('feelIn_lang') || 'ru');
  const t = TRANSLATIONS[lang];
  const [screen, setScreen] = useState(() => localStorage.getItem('feelIn_screen') || 'pairing');
  const [pairCode, setPairCode] = useState(() => localStorage.getItem('feelIn_pairCode') || '');
  const [userId, setUserId] = useState(() => localStorage.getItem('feelIn_userId') || '');
  const [data, setData] = useState(() => {
    const saved = localStorage.getItem('feelIn_data');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [socket, setSocket] = useState(null);
  const [diaryText, setDiaryText] = useState('');
  const [ritualText, setRitualText] = useState('');
  const [ritualDone, setRitualDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [quizAnswer, setQuizAnswer] = useState(null);
  const [myStatus, setMyStatus] = useState(null);
  const [hasAnsweredQuiz, setHasAnsweredQuiz] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: false }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: false }),
    ]).start();
  }, []);

  useEffect(() => {
    if (screen === 'home' && pairCode && userId) {
      localStorage.setItem('feelIn_screen', 'home');
      localStorage.setItem('feelIn_pairCode', pairCode);
      localStorage.setItem('feelIn_userId', userId);
      if (data) localStorage.setItem('feelIn_data', JSON.stringify(data));
    } else {
      localStorage.removeItem('feelIn_screen');
      localStorage.removeItem('feelIn_pairCode');
      localStorage.removeItem('feelIn_userId');
      localStorage.removeItem('feelIn_data');
    }
  }, [screen, pairCode, userId, data]);

  useEffect(() => {
    const newSocket = io(SERVER_URL);
    setSocket(newSocket);
    
    if (screen === 'home' && data?.id) {
      newSocket.emit('join-pair', data.id);
    }

    return () => newSocket.disconnect();
  }, []);

  // 🔔 Push Notifications
  useEffect(() => {
    const initNotifications = async () => {
      const pushToken = await registerForPushNotifications();
      
      if (pushToken && userId) {
        socket?.emit('register-push-token', { 
          user: userId, 
          token: pushToken,
          pairCode: pairCode || data?.code 
        });
        console.log('📤 Push token sent to server');
      }

      if (screen === 'home') {
        await scheduleDailyReminder(20, 0);
      }
    };

    initNotifications();
    
    return () => {
      cancelDailyReminder();
    };
  }, [socket, userId, pairCode, data, screen]);

  useEffect(() => {
    if (data) {
      const myRitualDone = userId === 'M' ? data?.ritual_a : data?.ritual_b;
      setRitualDone(!!myRitualDone);
    }
  }, [data, userId]);

  useEffect(() => {
    if (!socket) return;
    
    const events = [
      { name: 'ritual-updated', message: t.ritualGreat },
      { name: 'diary-updated', message: t.diaryAdded },
      { name: 'peace-updated', message: t.peaceSent },
      { name: 'quiz-updated', message: t.quizWaiting }
    ];
    
    const handlers = events.map(({ name, message }) => {
      const handler = (newData) => {
        setData(newData);
        showNotification('💫 Feel in', message);
      };
      socket.on(name, handler);
      return { name, handler };
    });
    
    const statusHandler = (newData) => {
      setData(newData);
      if (userId === 'M') setMyStatus(newData?.status_a);
      else setMyStatus(newData?.status_b);
    };
    socket.on('status-updated', statusHandler);
    
    return () => {
      handlers.forEach(({ name, handler }) => socket.off(name, handler));
      socket.off('status-updated', statusHandler);
    };
  }, [socket, t, userId]);

  const leavePair = () => {
    Alert.alert(t.attention, t.confirmLeave, [
      { text: 'Отмена', style: 'cancel' },
      { 
        text: 'Выйти', 
        style: 'destructive',
        onPress: () => {
          socket?.disconnect();
          setScreen('pairing');
          setPairCode('');
          setUserId('');
          setData(null);
          setMyStatus(null);
          setRitualDone(false);
          setHasAnsweredQuiz(false);
          setQuizAnswer(null);
          const newSocket = io(SERVER_URL);
          setSocket(newSocket);
        }
      }
    ]);
  };

  const createPair = async () => {
    if (!userId) { showNotification(t.attention, t.selectRole); return; }
    try {
      setLoading(true);
      const res = await axios.post(`${SERVER_URL}/api/pair/create`);
      setPairCode(res.data.code);
      setData({ code: res.data.code, id: res.data.pairId, streak: 0 });
      setScreen('home');
      socket?.emit('join-pair', res.data.pairId);
      showNotification(t.pairCreated, t.yourCode.replace('{code}', res.data.code));
    } catch (e) { 
      showNotification(t.error, t.checkInternet); 
    } finally { 
      setLoading(false); 
    }
  };

  const joinPair = async () => {
    if (!userId) { showNotification(t.attention, t.selectRole); return; }
    if (!pairCode.trim()) { showNotification(t.attention, t.enterCode); return; }
    try {
      setLoading(true);
      const res = await axios.post(`${SERVER_URL}/api/pair/join`, { code: pairCode.toUpperCase(), userId });
      setData(res.data.pair);
      socket?.emit('join-pair', res.data.pairId);
      setScreen('home');
      showNotification(t.welcome, t.inPair);
    } catch (e) { showNotification(t.error, e.response?.data?.error || t.codeInvalid); }
    finally { setLoading(false); }
  };

  const updateStatus = (val) => {
    const codeToSend = pairCode || data?.code;
    if (!codeToSend) return;
    setMyStatus(val);
    socket?.emit('update-status', { code: codeToSend, user: userId, value: val });
    showNotification(t.statusUpdated, t.yourMood.replace('{mood}', val));
  };

  const completeRitual = () => {
    const codeToSend = pairCode || data?.code;
    if (!codeToSend) return;
    if (ritualDone) { showNotification(t.attention, 'Уже выполнено!'); return; }
    if (!ritualText.trim()) { showNotification(t.attention, t.writeCompliment); return; }
    
    socket?.emit('complete-ritual', { code: codeToSend, user: userId, text: ritualText });
    setRitualDone(true);
    setRitualText('');
    showNotification(t.ritualGreat, t.ritualComplete);
  };

  const addDiary = () => {
    const codeToSend = pairCode || data?.code;
    if (!codeToSend) return;
    if (!diaryText.trim()) { showNotification(t.attention, 'Напиши что-нибудь!'); return; }
    
    socket?.emit('add-diary', { code: codeToSend, user: userId, text: diaryText });
    setData(prev => ({
      ...prev,
      diary: [...(prev?.diary || []), { id: Date.now().toString(), by: userId, text: diaryText, createdAt: new Date().toISOString() }]
    }));
    setDiaryText('');
    showNotification(t.diaryAdded, t.thanksSincerity);
  };

  const sendPeace = () => {
    const codeToSend = pairCode || data?.code;
    if (!codeToSend) return;
    socket?.emit('peace-request', { code: codeToSend, user: userId });
    showNotification(t.peaceSent, t.partnerNotified);
  };

  const submitQuiz = (ans) => {
    const codeToSend = pairCode || data?.code;
    if (!codeToSend) return;
    if (hasAnsweredQuiz) { showNotification(t.attention, 'Уже ответили!'); return; }
    setQuizAnswer(ans);
    setHasAnsweredQuiz(true);
    socket?.emit('quiz-submit', { code: codeToSend, user: userId, ans });
    showNotification(t.answerAccepted, t.waitingPartner);
  };

  const toggleLanguage = () => {
    const newLang = lang === 'ru' ? 'en' : 'ru';
    setLang(newLang);
    localStorage.setItem('feelIn_lang', newLang);
  };

  const AnimatedButton = ({ onPress, title, gradient, disabled, icon }) => {
    const scaleAnimBtn = useRef(new Animated.Value(1)).current;
    const handlePressIn = () => Animated.spring(scaleAnimBtn, { toValue: 0.95, friction: 8, useNativeDriver: false }).start();
    const handlePressOut = () => Animated.spring(scaleAnimBtn, { toValue: 1, friction: 8, useNativeDriver: false }).start();
    
    return (
      <View style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', marginVertical: 8 }}>
        <TouchableOpacity 
          style={[styles.button, styles[gradient], disabled && styles.buttonDisabled]}
          onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} disabled={disabled} activeOpacity={0.8}
        >
          <Animated.View style={{ transform: [{ scale: scaleAnimBtn }] }}>
            <Text style={styles.buttonText}>{icon} {title}</Text>
          </Animated.View>
        </TouchableOpacity>
      </View>
    );
  };

  if (screen === 'pairing') {
    return (
      <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.header}>
          <Text style={styles.logo}>💕 {t.appName}</Text>
          <Text style={styles.subtitle}>{t.tagline}</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity onPress={toggleLanguage} style={styles.langBtn}>
              <Text style={styles.langText}>{t.language}: {lang === 'ru' ? t.english : t.russian}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleTheme} style={styles.langBtn}>
              <Text style={styles.langText}>{t.theme}</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.card}>
          <AnimatedButton onPress={createPair} title={loading ? t.loading : t.createPair} gradient="btnPrimary" disabled={loading} />
          <Text style={styles.divider}>{t.orJoin}</Text>
          <TextInput placeholder={t.partnerCode} value={pairCode} onChangeText={setPairCode}
            style={styles.input} placeholderTextColor={COLORS.textDim} autoCapitalize="characters" />
          <View style={styles.roleSelector}>
            <TouchableOpacity style={[styles.roleBtn, userId === 'M' && styles.roleBtnActive]} onPress={() => setUserId('M')}>
              <Text style={[styles.roleText, userId === 'M' && styles.roleTextActive]}>{t.partnerM}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.roleBtn, userId === 'Ж' && styles.roleBtnActive]} onPress={() => setUserId('Ж')}>
              <Text style={[styles.roleText, userId === 'Ж' && styles.roleTextActive]}>{t.partnerF}</Text>
            </TouchableOpacity>
          </View>
          <AnimatedButton onPress={joinPair} title={loading ? t.loading : t.joinPair} gradient="btnSecondary" disabled={loading} />
        </View>
        <Text style={styles.footer}>{t.footer}</Text>
      </Animated.View>
    );
  }

  const todaysQuestion = getTodaysQuizQuestion(lang);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        <View style={styles.headerSmall}>
          <TouchableOpacity onPress={toggleLanguage} style={styles.langBtnSmall}>
            <Text style={styles.langTextSmall}>{lang === 'ru' ? '🇷 RU' : ' EN'}</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={toggleTheme} style={styles.langBtnSmall}>
              <Text style={styles.langTextSmall}>🌓</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={leavePair} style={styles.leaveBtn}>
              <Text style={styles.leaveText}>{t.leavePair}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.statusToday}</Text>
          <View style={styles.statusGrid}>
            {[
              { emoji: '🔴', label: t.hard, value: '🔴', color: '#FF6B6B' },
              { emoji: '🟡', label: t.normal, value: '🟡', color: '#FFB347' },
              { emoji: '🟢', label: t.good, value: '🟢', color: '#4CAF50' },
              { emoji: '⚡', label: t.excellent, value: '⚡', color: '#FFE66D' },
            ].map((item) => (
              <TouchableOpacity key={item.value} style={[styles.statusBtn, { borderColor: item.color }]} onPress={() => updateStatus(item.value)}>
                <Text style={[styles.statusEmoji, { color: item.color }]}>{item.emoji}</Text>
                <Text style={styles.statusLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.statusCard}>
            <Text style={styles.statusHint}>{t.my} <Text style={{ color: COLORS.primary }}>{myStatus || '-'}</Text></Text>
            <Text style={styles.statusHint}>{t.partner} <Text style={{ color: COLORS.secondary }}>{userId === 'M' ? data?.status_b : data?.status_a}</Text></Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.ritualDay}</Text>
          <View style={styles.card}>
            <Text style={styles.cardText}>{t.ritualText}</Text>
            {!ritualDone ? (
              <TextInput placeholder={t.ritualPlaceholder} value={ritualText} onChangeText={setRitualText}
                style={styles.input} placeholderTextColor={COLORS.textDim} multiline numberOfLines={2} />
            ) : (
              <View style={styles.ritualCompleted}>
                <Text style={styles.ritualCompletedText}>{t.ritualDone}</Text>
              </View>
            )}
            <AnimatedButton 
              onPress={completeRitual} 
              title={ritualDone ? t.completed : t.sendRitual}
              gradient={ritualDone ? 'btnSuccess' : 'btnPrimary'} 
              disabled={ritualDone || !ritualText.trim()} 
            />
            <View style={styles.streakBadge}>
              <Text style={styles.streakText}>{t.streak.replace('{days}', data?.streak || 0)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.peaceButton}</Text>
          <AnimatedButton 
            onPress={sendPeace}
            title={data?.peace?.active && data?.peace?.from === userId ? t.waiting : t.sendPeace} 
            gradient="btnPeace" 
          />
          {data?.peace?.active && data?.peace?.from !== userId && (
            <View style={styles.peaceNotification}>
              <Text style={styles.peaceText}>{t.peaceWants}</Text>
              <Text style={styles.peaceSubtext}>{t.peaceAccept}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.diary}</Text>
          <TextInput placeholder={t.diaryPlaceholder} value={diaryText} onChangeText={setDiaryText}
            style={styles.input} placeholderTextColor={COLORS.textDim} multiline numberOfLines={3} />
          <AnimatedButton onPress={addDiary} title={t.addDiary} gradient="btnAccent" />
          <View style={styles.diaryList}>
            {data?.diary?.slice().reverse().slice(0, 5).map((d, i) => (
              <View key={d.id || i} style={styles.diaryItem}>
                <Text style={styles.diaryBy}>{d.by === userId ? t.me : t.partnerDiary}:</Text>
                <Text style={styles.diaryText}>{d.text}</Text>
              </View>
            ))}
            {(!data?.diary || data.diary.length === 0) && (<Text style={styles.emptyText}>{t.noDiary}</Text>)}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.quiz}</Text>
          <View style={styles.card}>
            <Text style={styles.cardText}>{todaysQuestion?.q || t.quizLoading}</Text>
            {data?.quiz?.revealed ? (
              <View style={styles.quizResult}>
                <Text style={styles.quizResultText}>{t.quizAnswersOpen}</Text>
                <Text style={styles.quizMatch}>{data.quiz.ans_a === data.quiz.ans_b ? t.quizMatch : t.quizNoMatch}</Text>
              </View>
            ) : hasAnsweredQuiz ? (
              <Text style={styles.quizWaiting}>{t.quizWaiting}</Text>
            ) : !data?.quiz?.ans_a && !data?.quiz?.ans_b ? (
              <View style={styles.quizOptions}>
                <TouchableOpacity style={styles.quizBtn} onPress={() => submitQuiz(todaysQuestion?.a1)}>
                  <Text style={styles.buttonText}>{todaysQuestion?.a1}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quizBtn} onPress={() => submitQuiz(todaysQuestion?.a2)}>
                  <Text style={styles.buttonText}>{todaysQuestion?.a2}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.quizWaiting}>{t.quizWaiting}</Text>
            )}
          </View>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </Animated.View>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}