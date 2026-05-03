import React, { useState, useEffect, useRef, useCallback, memo, Component } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Alert, ActivityIndicator, Animated, Dimensions, FlatList, Modal, Platform, StatusBar, KeyboardAvoidingView, RefreshControl, PanResponder, Appearance, Linking, Share, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar } from 'expo-calendar';
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Haptics from 'expo-haptics';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Notifications from 'expo-notifications';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Updates from 'expo-updates';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as Localization from 'expo-localization';

Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: true }) });

const CONFIG = { SERVER_URL: 'https://feel-in.onrender.com', SUPABASE_URL: 'https://jgpcuebyysxkrdqkvqmz.supabase.co', SUPABASE_ANON_KEY: 'sb_publishable_xQWX7_juECMQlPzwW-cb9w_CLszetYD', EXPO_PROJECT_ID: '0636e412-9635-4a63-a35d-bf97572f3861', PAIR_CODE_PREFIX: 'FEEL-' };
const { width } = Dimensions.get('window');
const IS_WEB = Platform.OS === 'web';

const MOOD_RECOMMENDATIONS = {
  happy: ["📸 Скинь партнёру фото момента", "📅 Запланируйте свидание", "💌 Напишите, что вас радует"],
  sad: ["💓 Отправьте пульс любви", "💌 Напишите тёплое сообщение", "🤗 Попросите поддержки"],
  love: ["✨ Сделайте ежедневный ритуал", "📝 Запишите чувства в дневник", "🎁 Приготовьте сюрприз"],
  hug: ["🫂 Отправьте виртуальные объятия", "💬 Скажите, почему цените партнёра", "🎵 Включите вашу песню"],
  adore: ["💖 Напишите комплимент", "🌹 Вспомните первое свидание", "💫 Поделитесь мечтой"],
  angry: ["🧘 Сделайте глубокий вдох", "💬 Обсудите проблему спокойно", "🕊️ Нажмите кнопку «Мир»"],
  sleepy: ["🌙 Пожелайте спокойной ночи", "😴 Включите режим сна", "💤 Отдохните, утро мудренее"],
  celebrate: ["🎊 Поделитесь радостью", "🥂 Запланируйте праздник", "📸 Сделайте совместное фото"]
};

const translations = {
  ru: { welcome: "Feel In", createPair: "✨ Создать пару", join: "🔑 Войти", codeLabel: "Код пары", back: "← Назад", days: "Дней", ritual: "Ритуал", messages: "Собщ", mood: "😊 Настроение", chat: "💬 Чат", dates: "📅 Даты", achievements: "🏆", ritualCard: "✨ Ритуал", peace: "🕊️ Мир", sleepOn: "🌙 Режим сна", sleepOff: "☀️ Выйти из сна", settings: "⚙️", security: "🔐", notifications: "🔊", privacy: "🛡️", export: "📥", delete: "🗑", theme: "🎨", language: "🌍", light: "Светлая", dark: "Тёмная", russian: "Русский", english: "English", quiz: "🎮 Вопрос дня", answer: "Ответить", waitPartner: "Ждём ответ...", revealed: "Ответы открыты!", haptic: "💓 Love", noMessages: "Начните общение", typing: "печатает...", send: "➤", attach: "📷", gratitude: "За что благодарны?", writeThoughts: "Ваши мысли...", save: "💾 Сохранить", cancel: "Отмена", addDate: "+ Дата", importCalendar: "📥 Импорт", noDates: "Нет дат", today: "Сегодня!", daysLeft: "дн.", profile: "👤 Профиль", nickname: "Никнейм", color: "Цвет", done: "Готово", protection: "Защита", faceId: "Face ID", changePin: "🔑 PIN", sounds: "Звуки", hideText: "Скрывать текст", digest: "📊 Дайджест", digestTitle: "Ваша неделя", messagesSent: "Сообщений", avgPulse: "Пульс", streakDays: "Дней ритуала", datesUpcoming: "Ближайшие даты", exportDesc: "Скачать JSON", deleteDesc: "Удалить аккаунт", deleteConfirm: "Удалить навсегда?", exportSuccess: "Сохранено", deleteSuccess: "Удалено", importTitle: "Импорт", close: "Закрыть", noEvents: "Нет событий", nextDate: "Событие", countdown: "через", weekReport: "Отчёт", moodImproved: "Настроение улучшилось", recommendations: "Советы", streak: "Серия", matchStats: "Совпадения", themeUnlocked: "Тема открыта!", progress: "История", secret: "Секрет", joinPair: "Войти", createNewPair: "Создать", yourCode: "Код", partner: "Партнёр", you: "Вы", online: "онлайн", offline: "офлайн", selectGender: "Выберите пол", male: "👨 Мужской", female: "👩 Женский", continue: "Продолжить", myStatus: "Моё", partnerStatus: "Партнёр", partnerConnected: "🎉 Партнёр подключился!", syncMessage: "Теперь вы можете общаться в реальном времени!",
    first_message: "Первое сообщение", seven_days: "7 дней вместе", hundred_messages: "100 сообщений", first_peace: "Первый мир", month_together: "Месяц вместе", perfect_pulse: "Идеальный пульс", quiz_master: "Мастер квиза", secret_theme: "Секретная тема"
  },
  en: { welcome: "Feel In", createPair: "✨ Create", join: "🔑 Join", codeLabel: "Code", back: "← Back", days: "Days", ritual: "Ritual", messages: "Msgs", mood: "😊 Mood", chat: "💬 Chat", dates: "📅 Dates", achievements: "🏆", ritualCard: "✨ Ritual", peace: "🕊️ Peace", sleepOn: "🌙 Sleep", sleepOff: "☀️ Wake", settings: "⚙️", security: "🔐", notifications: "🔊", privacy: "🛡️", export: "📥", delete: "🗑", theme: "🎨", language: "🌍", light: "Light", dark: "Dark", russian: "Russian", english: "English", quiz: "🎮 Quiz", answer: "Answer", waitPartner: "Waiting...", revealed: "Revealed!", haptic: "💓 Love", noMessages: "No messages", typing: "typing...", send: "➤", attach: "📷", gratitude: "Grateful?", writeThoughts: "Thoughts...", save: "💾 Save", cancel: "Cancel", addDate: "+ Date", importCalendar: "📥 Import", noDates: "No dates", today: "Today!", daysLeft: "days", profile: "👤 Profile", nickname: "Nickname", color: "Color", done: "Done", protection: "Protection", faceId: "Face ID", changePin: "🔑 PIN", sounds: "Sounds", hideText: "Hide text", digest: "📊 Digest", digestTitle: "Your week", messagesSent: "Messages", avgPulse: "Pulse", streakDays: "Streak", datesUpcoming: "Dates", exportDesc: "Save JSON", deleteDesc: "Delete account", deleteConfirm: "Delete forever?", exportSuccess: "Saved", deleteSuccess: "Deleted", importTitle: "Import", close: "Close", noEvents: "No events", nextDate: "Event", countdown: "in", weekReport: "Report", moodImproved: "Mood up", recommendations: "Tips", streak: "Streak", matchStats: "Matches", themeUnlocked: "Theme!", progress: "History", secret: "Secret", joinPair: "Join", createNewPair: "Create", yourCode: "Code", partner: "Partner", you: "You", online: "online", offline: "offline", selectGender: "Select gender", male: "👨 Male", female: "👩 Female", continue: "Continue", myStatus: "Me", partnerStatus: "Partner", partnerConnected: "🎉 Partner connected!", syncMessage: "Now you can chat in real-time!",
    first_message: "First Message", seven_days: "7 Days", hundred_messages: "100 Messages", first_peace: "First Peace", month_together: "1 Month", perfect_pulse: "Perfect Pulse", quiz_master: "Quiz Master", secret_theme: "Secret Theme"
  }
};

const themes = {
  light: { bg: '#f5f5f7', bgCard: '#ffffff', primary: '#ff4d6d', secondary: '#48cae4', accent: '#c77dff', success: '#06d6a0', warning: '#ffd166', text: '#1a1a1a', textSecondary: '#6b7280', textMuted: '#9ca3af', border: '#e5e7eb', msgMe: '#ff4d6d', msgPartner: '#f3f4f6', cardBg: '#ffffff', name: 'Light' },
  dark: { bg: '#0a0a14', bgCard: '#141428', primary: '#ff4d6d', secondary: '#48cae4', accent: '#c77dff', success: '#06d6a0', warning: '#ffd166', text: '#ffffff', textSecondary: '#a0a0c0', textMuted: '#6b6b8a', border: '#2a2a45', msgMe: '#ff4d6d', msgPartner: '#1a1a35', cardBg: '#141428', name: 'Dark' },
  ocean: { bg: '#0f172a', bgCard: '#1e293b', primary: '#06b6d4', secondary: '#8b5cf6', accent: '#f43f5e', success: '#10b981', warning: '#f59e0b', text: '#f1f5f9', textSecondary: '#94a3b8', textMuted: '#64748b', border: '#334155', msgMe: '#06b6d4', msgPartner: '#1e293b', cardBg: '#1e293b', name: 'Ocean' },
  sunset: { bg: '#1c1017', bgCard: '#2d1b25', primary: '#f472b6', secondary: '#fb923c', accent: '#facc15', success: '#4ade80', warning: '#f87171', text: '#fef3c7', textSecondary: '#fdba74', textMuted: '#9a3412', border: '#4c1d95', msgMe: '#f472b6', msgPartner: '#2d1b25', cardBg: '#2d1b25', name: 'Sunset' },
  forest: { bg: '#052e16', bgCard: '#14532d', primary: '#22c55e', secondary: '#84cc16', accent: '#a3e635', success: '#34d399', warning: '#fbbf24', text: '#dcfce7', textSecondary: '#86efac', textMuted: '#4ade80', border: '#166534', msgMe: '#22c55e', msgPartner: '#14532d', cardBg: '#14532d', name: 'Forest' },
  galaxy: { bg: '#020617', bgCard: '#0f172a', primary: '#818cf8', secondary: '#c084fc', accent: '#f472b6', success: '#38bdf8', warning: '#fbbf24', text: '#e0e7ff', textSecondary: '#a5b4fc', textMuted: '#818cf8', border: '#312e81', msgMe: '#818cf8', msgPartner: '#0f172a', cardBg: '#0f172a', name: 'Galaxy' },
  secret: { bg: '#18181b', bgCard: '#27272a', primary: '#f43f5e', secondary: '#ec4899', accent: '#f59e0b', success: '#10b981', warning: '#f97316', text: '#fafafa', textSecondary: '#d4d4d8', textMuted: '#a1a1aa', border: '#3f3f46', msgMe: '#f43f5e', msgPartner: '#27272a', cardBg: '#27272a', name: 'Secret' }
};

const MOOD_EMOJIS = [ { emoji: '😊', key: 'happy' }, { emoji: '😔', key: 'sad' }, { emoji: '😍', key: 'love' }, { emoji: '🤗', key: 'hug' }, { emoji: '🥰', key: 'adore' }, { emoji: '😤', key: 'angry' }, { emoji: '😴', key: 'sleepy' }, { emoji: '🎉', key: 'celebrate' } ];
const AVATAR_COLORS = ['#ff4d6d', '#48cae4', '#c77dff', '#06d6a0', '#ffd166', '#ff9f43'];
const ACHIEVEMENTS = [ { id: 'first_message', title: 'first_message', icon: '💬', cond: s => s.totalMessages >= 1 }, { id: 'seven_days', title: 'seven_days', icon: '🔥', cond: s => s.streak >= 7 }, { id: 'hundred_messages', title: 'hundred_messages', icon: '💯', cond: s => s.totalMessages >= 100 }, { id: 'first_peace', title: 'first_peace', icon: '🕊️', cond: s => s.peaceSent >= 1 }, { id: 'month_together', title: 'month_together', icon: '💕', cond: s => s.daysTogether >= 30 }, { id: 'perfect_pulse', title: 'perfect_pulse', icon: '💯', cond: s => s.pulseScore >= 100 }, { id: 'quiz_master', title: 'quiz_master', icon: '🧠', cond: s => s.quizStreak >= 7 }, { id: 'secret_theme', title: 'secret_theme', icon: '🔮', cond: s => s.totalMessages >= 500 } ];
const DAILY_QUESTIONS = [ "Яркое воспоминание? 📸", "За что ценишь? 💖", "Куда полетим? ✈️", "Что радует? 😊", "Идеальный вечер? 🍷", "Что попробовать? 🎢", "Благодарен? 🙏", "Моё качество? ✨", "Песня для нас? 🎵", "Чувства рядом? 🫂" ];

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() { const colors = themes.dark; if (this.state.hasError) return <SafeAreaView style={styles.safeArea}><View style={styles.center}><Text style={styles.errorIcon}>😕</Text><Text style={[styles.errorTitle,{color:colors.text}]}>Ошибка</Text><TouchableOpacity onPress={() => this.setState({ hasError: false })} style={{marginTop:20, backgroundColor:colors.primary, padding:15, borderRadius:10}}><Text style={{color:'#fff', fontWeight:'700'}}>Перезапустить</Text></TouchableOpacity></View></SafeAreaView>; return this.props.children; }
}

const GradientButton = memo(({ onPress, title, colors: gradColors, icon, disabled, style }) => {
  const scale = useRef(new Animated.Value(1)).current;
  return (<TouchableOpacity activeOpacity={0.9} onPressIn={() => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start()} onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()} onPress={onPress} disabled={disabled} style={[{opacity: disabled?0.5:1}, style]}><Animated.View style={{transform:[{scale}]}}><LinearGradient colors={gradColors} style={styles.gradientButton}>{icon && <Text style={styles.buttonIcon}>{icon}</Text>}<Text style={styles.buttonText} numberOfLines={1} ellipsizeMode="tail" adjustsFontSizeToFit>{title}</Text></LinearGradient></Animated.View></TouchableOpacity>);
});
const Card = memo(({children, style}) => <View style={[styles.card, style]}>{children}</View>);

const ConfettiOverlay = ({ visible }) => {
  const [particles, setParticles] = useState([]);
  useEffect(() => { if (visible) { const newParticles = Array.from({ length: 30 }).map((_, i) => ({ id: i, x: Math.random() * width, y: -50, speed: 3 + Math.random() * 5, rotation: Math.random() * 360, emoji: ['💖', '✨', '🎉', ''][Math.floor(Math.random() * 4)] })); setParticles(newParticles); setTimeout(() => setParticles([]), 2500); } }, [visible]);
  if (particles.length === 0) return null;
  return (<View style={styles.confettiContainer} pointerEvents="none">{particles.map(p => <AnimatedConfetti key={p.id} config={p} />)}</View>);
};
const AnimatedConfetti = ({ config }) => {
  const animY = useRef(new Animated.Value(config.y)).current; const animRot = useRef(new Animated.Value(config.rotation)).current;
  useEffect(() => { Animated.parallel([Animated.timing(animY, { toValue: 800, duration: 2000 / config.speed * 2, useNativeDriver: true }), Animated.timing(animRot, { toValue: config.rotation + 360, duration: 2000, useNativeDriver: true })]).start(); }, []);
  return (<Animated.View style={{ position: 'absolute', left: config.x, top: animY, transform: [{ rotate: animRot.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] }) }] }}><Text style={{ fontSize: 24 }}>{config.emoji}</Text></Animated.View>);
};

function AppContent() {
  const [currentScreen, setCurrentScreen] = useState('welcome');
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const [pairCode, setPairCode] = useState('');
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusA, setStatusA] = useState(''); // Статус 'M'
  const [statusB, setStatusB] = useState(''); // Статус 'Ж'
  const [ritualText, setRitualText] = useState('');
  const [peaceActive, setPeaceActive] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [daysTogether, setDaysTogether] = useState(0);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState('');
  const [myNickname, setMyNickname] = useState('');
  const [partnerNickname, setPartnerNickname] = useState('Партнёр');
  const [myAvatarColor, setMyAvatarColor] = useState(AVATAR_COLORS[0]);
  const [partnerAvatarColor, setPartnerAvatarColor] = useState(AVATAR_COLORS[1]);
  const [streak, setStreak] = useState(0);
  const [totalMessages, setTotalMessages] = useState(0);
  const [partnerSleeping, setPartnerSleeping] = useState(false);
  const [mySleeping, setMySleeping] = useState(false);
  const [pulseScore, setPulseScore] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [securityEnabled, setSecurityEnabled] = useState(false);
  const [pinCode, setPinCode] = useState('');
  const [showPinScreen, setShowPinScreen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [unlockedAchievements, setUnlockedAchievements] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hideNotificationContent, setHideNotificationContent] = useState(false);
  const [importantDates, setImportantDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dateTitle, setDateTitle] = useState('');
  const [showAddDateModal, setShowAddDateModal] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [quizState, setQuizState] = useState({ question: '', answered: false, revealed: false, myAns: '', partnerAns: '' });
  const [quizInput, setQuizInput] = useState('');
  const [showDigest, setShowDigest] = useState(false);
  const [digestData, setDigestData] = useState({ messages: 0, pulse: 0, streak: 0, dates: [], prevPulse: 0, prevMessages: 0 });
  const [themeMode, setThemeMode] = useState('dark');
  const [lang, setLang] = useState(Localization.locale.startsWith('ru') ? 'ru' : 'en');
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [showCalendarImport, setShowCalendarImport] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [showReactions, setShowReactions] = useState(null);
  const [ritualHistory, setRitualHistory] = useState([]);
  const [quizStreak, setQuizStreak] = useState(0);
  const [matchStats, setMatchStats] = useState({ total: 0, matches: 0 });
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showGenderModal, setShowGenderModal] = useState(false);
  const [pendingPairData, setPendingPairData] = useState(null);
  const [showSyncMessage, setShowSyncMessage] = useState(false);
  const [creatorGender, setCreatorGender] = useState(null); // ✅ Для авто-назначения пола
  
  const colors = themes[themeMode] || themes.dark;
  const t = useCallback((key) => translations[lang][key] || key, [lang]);

  const hapticScale = useRef(new Animated.Value(1)).current;
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const animationRef = useRef(null);
  const socketRef = useRef(null);
  const chatListRef = useRef(null);
  const [fadeIn] = useState(new Animated.Value(0));
  const pan = useRef(new Animated.ValueXY()).current;
  const panResponder = useRef(PanResponder.create({ onStartShouldSetPanResponder: () => true, onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }), onPanResponderRelease: () => { pan.extractOffset(); } })).current;

  const secureGet = async (key) => IS_WEB ? AsyncStorage.getItem(key) : SecureStore.getItemAsync(key);
  const secureSet = async (key, val) => IS_WEB ? AsyncStorage.setItem(key, val) : SecureStore.setItemAsync(key, val);
  const secureDel = async (key) => IS_WEB ? AsyncStorage.removeItem(key) : SecureStore.deleteItemAsync(key);
  const triggerConfetti = useCallback(() => { setShowConfetti(true); setTimeout(() => setShowConfetti(false), 2500); }, []);

  // ✅ АВТОСКРОЛЛ ЧАТА
  useEffect(() => { if (chatListRef.current && messages.length > 0) setTimeout(() => { chatListRef.current.scrollToEnd({ animated: true }); }, 100); }, [messages]);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      try {
        const seen = await AsyncStorage.getItem('hasSeenOnboarding'); if (seen) setHasSeenOnboarding(true);
        const sec = await secureGet('securityEnabled'); const pin = await secureGet('pinCode');
        const ach = await AsyncStorage.getItem('unlockedAchievements'); const snd = await AsyncStorage.getItem('soundEnabled'); const hid = await AsyncStorage.getItem('hideNotificationContent');
        const dates = await AsyncStorage.getItem('importantDates'); const pairData = await secureGet('pairData');
        const savedQuiz = await AsyncStorage.getItem('dailyQuiz'); const savedTheme = await AsyncStorage.getItem('themeMode'); const savedLang = await AsyncStorage.getItem('appLang');
        if (savedTheme) setThemeMode(savedTheme); if (savedLang) setLang(savedLang);
        if (savedQuiz) { const parsed = JSON.parse(savedQuiz); const today = new Date().toDateString(); if (parsed.date === today) setQuizState(parsed); }
        if (sec) setSecurityEnabled(sec === 'true'); if (pin) setPinCode(pin);
        if (ach) setUnlockedAchievements(JSON.parse(ach)); if (snd !== null) setSoundEnabled(snd === 'true'); if (hid) setHideNotificationContent(hid === 'true');
        if (dates) setImportantDates(JSON.parse(dates));
        if (pairData && isMounted) { const p = JSON.parse(pairData); setPairCode(p.pairCode); setUserRole(p.userRole); if (sec === 'true' && pin) setShowPinScreen(true); else { setCurrentScreen('main'); connectSocket(p.pairCode); } }
        const start = await AsyncStorage.getItem('relationshipStart'); if (start) setDaysTogether(Math.max(0, Math.floor((Date.now() - new Date(start)) / 86400000)));
        const s = await AsyncStorage.getItem('ritualStreak'); const m = await AsyncStorage.getItem('chatMessages'); const tVal = await AsyncStorage.getItem('totalMessages');
        const n = await AsyncStorage.getItem('myNickname'); const c = await AsyncStorage.getItem('myAvatarColor');
        if (s) setStreak(parseInt(s)); if (m) setMessages(JSON.parse(m)); if (tVal) setTotalMessages(parseInt(tVal)); if (n) setMyNickname(n); if (c) setMyAvatarColor(c);
        if (isMounted) { setIsInitialized(true); Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: !IS_WEB }).start(); }
      } catch (e) { console.error(e); if (isMounted) { setIsInitialized(true); setCurrentScreen('welcome'); } }
    };
    init();
    const sub = Linking.addEventListener('url', ({ url }) => { if (url.includes('join=')) { setPairCode(url.split('join=')[1]); setCurrentScreen('join'); } });
    return () => { isMounted = false; sub.remove(); if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current); };
  }, []);

  const connectSocket = useCallback((code) => {
    if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; }
    try {
      const newSocket = io(CONFIG.SERVER_URL, { transports: ['websocket', 'poll'], reconnection: true, reconnectionDelay: 1000, timeout: 20000 });
      
      newSocket.on('connect', () => {
        console.log('✅ Socket connected, joining pair:', code);
        setIsOnline(true);
        newSocket.emit('join-pair', code);
        // ✅ Загружаем сообщения сразу после входа в комнату
        setTimeout(() => {
          newSocket.emit('load-messages', { pairCode: code });
          newSocket.emit('get-profiles', { pairCode: code });
        }, 500);
        if (myNickname) newSocket.emit('update-profile', { pairCode: code, user: userRole, nickname: myNickname, avatarColor: myAvatarColor });
      });
      
      newSocket.on('disconnect', () => { setIsOnline(false); setPartnerOnline(false); });
      newSocket.on('connect_error', () => { setIsOnline(false); });
      
      newSocket.on('profiles-loaded', (p) => { 
        if(!p) return; 
        const me=p.find(x=>x.user_id===userRole), ot=p.find(x=>x.user_id!==userRole); 
        if(me){setMyNickname(me.nickname||'Я');setMyAvatarColor(me.avatar_color||AVATAR_COLORS[0]);} 
        if(ot){setPartnerNickname(ot.nickname||'Партнёр');setPartnerAvatarColor(ot.avatar_color||AVATAR_COLORS[1]);} 
      });
      
      // ✅ ИСПРАВЛЕНО 2: Чат грузится и принимает сообщения стабильно
      newSocket.on('messages-loaded', (m) => { 
        console.log('💬 Messages loaded:', m?.length || 0);
        setMessages(m || []); 
        AsyncStorage.setItem('chatMessages', JSON.stringify(m || [])); 
      });
      
      newSocket.on('new-message', async (msg) => {
        console.log('📨 New message received:', msg);
        if (!msg) return;
        setMessages(prev => { 
          const f = (prev || []).filter(x => !x.temp || x.id === msg.id); 
          const u = [...f, msg]; 
          AsyncStorage.setItem('chatMessages', JSON.stringify(u)); 
          return u; 
        });
        if (msg.user_id !== userRole) {
          newSocket.emit('mark-read', { pairCode: code, messageId: msg.id, reader: userRole });
          if (!IS_WEB) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            const c = hideNotificationContent ? { title: '💬 Сообщение', body: 'Нажмите' } : { title: `💬 ${msg.nickname || 'Партнёр'}`, body: msg.media_type ? '📎 Вложение' : msg.text };
            await Notifications.scheduleNotificationAsync({ content: { ...c, sound: soundEnabled ? 'default' : null }, trigger: null });
          }
        }
      });

      newSocket.on('message-sent', (msg) => { 
        if(!msg) return; 
        setMessages(prev=>{const f=(prev||[]).filter(x=>!x.temp),u=[...f,msg];AsyncStorage.setItem('chatMessages',JSON.stringify(u));return u;}); 
        checkAchievements(); 
      });
      newSocket.on('message-read', (d) => { if(!d||!d.messageId) return; setMessages(p=>(p||[]).map(m=>m.id===d.messageId?{...m,read_by_partner:true}:m)); });
      newSocket.on('partner-typing', (d)=>{if(!d)return;setPartnerTyping(d.nickname||'Партнёр');});
      newSocket.on('partner-stopped-typing', ()=>setPartnerTyping(''));
      
      newSocket.on('status-updated', (d) => {
        if (!d || !d.user) return;
        if (d.user === 'M') setStatusA(d.value);
        else setStatusB(d.value);
      });

      newSocket.on('peace-updated', (d) => { if (!d) return; setPeaceActive(d.active); if (d.active && d.from !== userRole) Alert.alert('🕊️ Мир!', `${d.from === 'M' ? 'Он' : 'Она'} хочет помириться!`); });
      newSocket.on('ritual-updated', (entry) => {
        setRitualHistory(prev => { if (prev.some(r => r.id === entry.id)) return prev; const updated = [entry, ...prev].slice(0, 10); AsyncStorage.setItem('ritualHistory', JSON.stringify(updated)); return updated; });
        if (entry.user !== userRole) setStreak(entry.streak || 0);
      });
      newSocket.on('streak-updated', (d) => { if(!d||d.streak===undefined)return; setStreak(d.streak); AsyncStorage.setItem('ritualStreak',d.streak.toString()); checkAchievements(); });
      
      // ✅ ИСПРАВЛЕНО 4: Режим сна блокирует чат корректно
      newSocket.on('sleep-updated', (p) => { 
        if(!p || !p.user) return; 
        if (p.user === userRole) setMySleeping(p.active === true);
        else setPartnerSleeping(p.active === true);
      });
      
      newSocket.on('quiz-updated', ({ quiz }) => {
        if (!quiz) return;
        const today = new Date().toDateString();
        const questionIdx = new Date().getDate() % DAILY_QUESTIONS.length;
        const myField = userRole === 'M' ? 'ans_a' : 'ans_b';
        const partnerField = userRole === 'M' ? 'ans_b' : 'ans_a';
        
        setQuizState(prev => ({
          date: today,
          question: quiz.question || DAILY_QUESTIONS[questionIdx],
          answered: !!quiz[myField],
          revealed: quiz.revealed || false,
          myAns: quiz[myField] || prev.myAns,
          partnerAns: quiz[partnerField] || prev.partnerAns
        }));
        AsyncStorage.setItem('dailyQuiz', JSON.stringify({ date: today, question: quiz.question, myAns: quiz[myField], partnerAns: quiz[partnerField], answered: !!quiz[myField], revealed: quiz.revealed }));
      });

      socketRef.current = newSocket;
    } catch(e) { console.error('❌ Socket failed:', e); setHasError(true); }
  }, [myNickname, quizState, hideNotificationContent, soundEnabled, userRole]);

  const checkAchievements = useCallback(async () => {
    const stats={totalMessages,streak,daysTogether,peaceSent:peaceActive?1:0,pulseScore,quizStreak};
    const newA=[...unlockedAchievements]; let has=false;
    ACHIEVEMENTS.forEach(a=>{if(!newA.includes(a.id)&&a.cond(stats)){newA.push(a.id);has=true;Alert.alert('🏆',`${a.icon} ${t(a.title)}`); if(themeMode==='dark' && a.id==='secret_theme') { setThemeMode('secret'); AsyncStorage.setItem('themeMode','secret'); Alert.alert(t('themeUnlocked')); }}});
    if(has){setUnlockedAchievements(newA);await AsyncStorage.setItem('unlockedAchievements',JSON.stringify(newA));}
  }, [unlockedAchievements, totalMessages, streak, daysTogether, peaceActive, pulseScore, quizStreak, t, themeMode]);

  useEffect(() => { 
    let sc=0; 
    const myStatus = userRole === 'M' ? statusA : statusB;
    const partnerStatus = userRole === 'M' ? statusB : statusA;
    if(myStatus && partnerStatus && myStatus === partnerStatus) sc += 40; 
    else if(myStatus || partnerStatus) sc += 15; 
    sc += Math.min(streak*3, 30); sc += Math.min((messages?.length||0)*0.25, 30); 
    sc = Math.min(Math.max(sc, 0), 100); setPulseScore(sc); 
    if(animationRef.current) animationRef.current.stop(); 
    if(sc > 5) {
      const dur = 2000 - (sc/100)*800, sc2 = 1.1 + (sc/100)*0.3; 
      const lp = Animated.loop(Animated.sequence([Animated.timing(pulseAnim,{toValue:sc2,duration:dur,useNativeDriver:!IS_WEB}), Animated.timing(pulseAnim,{toValue:1,duration:dur,useNativeDriver:!IS_WEB})]));
      lp.start(); animationRef.current = lp; 
    } else { pulseAnim.setValue(1); }
  }, [statusA, statusB, streak, messages?.length, userRole]);

  // ✅ ИСПРАВЛЕНО 3: Авто-назначение противоположного пола
  const handleJoinWithGender = useCallback(async (gender) => {
    if (!pendingPairData) return;
    setLoading(true);
    try {
      const { code, isNew } = pendingPairData;
      let finalGender = gender;
      
      if (!isNew && creatorGender) {
        // Если входит второй пользователь, автоматически назначаем противоположный пол
        finalGender = creatorGender === 'M' ? 'Ж' : 'M';
        console.log(`🔄 Auto-assigning opposite gender: ${finalGender}`);
      } else if (isNew) {
        setCreatorGender(gender);
      }
      
      if (isNew) {
        setPairCode(code); setUserRole(finalGender); setCurrentScreen('main');
        await secureSet('pairData', JSON.stringify({pairCode: code, userRole: finalGender, timestamp: Date.now()}));
        if(!await AsyncStorage.getItem('relationshipStart')) await AsyncStorage.setItem('relationshipStart', new Date().toISOString());
        connectSocket(code);
      } else {
        const r = await fetch(`${CONFIG.SERVER_URL}/api/pair/join`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({code}) });
        if(!r.ok) throw new Error('Server Error');
        const d = await r.json();
        setPairCode(d.pair.code); setUserRole(finalGender); setCurrentScreen('main');
        await secureSet('pairData', JSON.stringify({pairCode: d.pair.code, userRole: finalGender, timestamp: Date.now()}));
        connectSocket(d.pair.code);
        setPartnerOnline(true); setShowSyncMessage(true); setTimeout(() => setShowSyncMessage(false), 3000);
      }
      setShowGenderModal(false); setPendingPairData(null);
    } catch(e) { Alert.alert('Ошибка', 'Не удалось.'); } finally { setLoading(false); }
  }, [pendingPairData, creatorGender]);

  if(showPinScreen) return (<SafeAreaView style={[styles.safeArea,{backgroundColor:colors.bg}]}><View style={styles.pinContainer}><Text style={styles.pinIcon}>🔐</Text><Text style={[styles.pinTitle,{color:colors.text}]}>{t('protection')}</Text><View style={styles.pinInputContainer}>{[0,1,2,3].map(i => <View key={i} style={[styles.pinDot,{backgroundColor:pinInput.length>i?colors.primary:colors.bgCard}]}/>)}</View><TextInput style={styles.pinInputHidden} value={pinInput} onChangeText={setPinInput} keyboardType="number-pad" maxLength={4} autoFocus onSubmitEditing={()=>{if(pinCode&&pinInput===pinCode){setShowPinScreen(false);setPinInput('');}else Alert.alert('Неверный PIN');}}/><TouchableOpacity onPress={()=>setShowPinScreen(false)} style={{marginTop:30}}><Text style={[styles.pinCancel,{color:colors.textSecondary}]}>{t('cancel')}</Text></TouchableOpacity></View></SafeAreaView>);
  if(!isInitialized) return (<View style={[styles.loading,{backgroundColor:colors.bg}]}><ActivityIndicator size="large" color={colors.primary}/><Text style={[styles.loadingText,{color:colors.text}]}>Загрузка...</Text></View>);
  if(hasError) return (<View style={[styles.errorContainer,{backgroundColor:colors.bg}]}><Text style={styles.errorIcon}>😕</Text><Text style={[styles.errorTitle,{color:colors.text}]}>{t('welcome')}</Text><GradientButton onPress={()=>setHasError(false)} title="Перезапустить" colors={[colors.primary, '#ff6b9d']} /></View>);
  if(!hasSeenOnboarding) return (<SafeAreaView style={[styles.safeArea,{backgroundColor:colors.bg}]}><View style={styles.onboardingContainer}><Animated.View style={{opacity:fadeIn,transform:[{scale:fadeIn}]}}><Text style={styles.onboardingIcon}>💕</Text><Text style={[styles.onboardingTitle,{color:colors.text}]}>{t('welcome')}</Text><Text style={[styles.onboardingDesc,{color:colors.textSecondary}]}>Feel In — личное пространство только для вас двоих.</Text><View style={styles.dots}><View style={[styles.dot,{backgroundColor:colors.primary,width:24}]}/></View><GradientButton onPress={()=>{setHasSeenOnboarding(true);AsyncStorage.setItem('hasSeenOnboarding','true');}} title="Начать" colors={[colors.primary,'#ff6b9d']} style={{marginTop:20}} /></Animated.View></View></SafeAreaView>);

  const myStatus = userRole === 'M' ? statusA : statusB;
  const partnerStatus = userRole === 'M' ? statusB : statusA;
  const moodRecommendations = myStatus ? MOOD_RECOMMENDATIONS[MOOD_EMOJIS.find(m => m.emoji === myStatus)?.key] || [] : [];

  const nextDate = importantDates.length > 0 ? importantDates.reduce((a, b) => new Date(a.date) < new Date(b.date) ? a : b) : null;
  const countdown = nextDate ? Math.ceil((new Date(nextDate.date) - new Date()) / (1000 * 60 * 60 * 24)) : null;

  return (
    <SafeAreaView style={[styles.safeArea,{backgroundColor:colors.bg}]}>
      <StatusBar barStyle={themeMode==='light'?'dark-content':'light-content'} backgroundColor={colors.bg} />
      <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={[styles.container,{backgroundColor:colors.bg}]}>
        {currentScreen==='welcome'&&(
          <Animated.View style={[styles.center,{opacity:fadeIn}]}>
            <Text style={styles.logo}>💕</Text><Text style={[styles.title,{color:colors.text}]} numberOfLines={1}>Feel In</Text><Text style={[styles.subtitle,{color:colors.textSecondary}]} numberOfLines={2}>Ваше личное пространство</Text>
            <View style={styles.btns}>
              <GradientButton onPress={async()=>{setLoading(true);try{const r=await fetch(`${CONFIG.SERVER_URL}/api/pair/create`,{method:'POST',headers:{'Content-Type':'application/json'}});if(!r.ok)throw new Error();const d=await r.json();setPendingPairData({code:d.code, isNew:true});setShowGenderModal(true);}catch(e){Alert.alert('Ошибка','Не удалось.');}finally{setLoading(false);}}} title={loading?'...':t('createPair')} colors={[colors.primary,'#ff6b9d']} disabled={loading}/>
              <TouchableOpacity onPress={()=>{setPendingPairData({isNew:false});setCurrentScreen('join')}} style={[styles.btnSecondary,{backgroundColor:colors.bgCard,borderColor:colors.border}]}><Text style={[styles.btnSecondaryText,{color:colors.text}]} numberOfLines={1}>{t('join')}</Text></TouchableOpacity>
            </View>
          </Animated.View>
        )}
        {currentScreen==='join'&&(
          <View style={[styles.container,{backgroundColor:colors.bg}]}>
            <TouchableOpacity style={styles.back} onPress={()=>setCurrentScreen('welcome')}><Text style={[styles.backText,{color:colors.textSecondary}]}>{t('back')}</Text></TouchableOpacity>
            <View style={styles.center}><Text style={[styles.sectionTitle,{color:colors.text, textAlign: 'center'}]} numberOfLines={1}>{t('codeLabel')}</Text><TextInput style={[styles.input,{backgroundColor:colors.bgCard,color:colors.text,borderColor:colors.border, textAlign: 'center'}]} placeholder="FEEL-XXXX" placeholderTextColor={colors.textMuted} value={pairCode} onChangeText={setPairCode} autoCapitalize="characters" maxLength={12}/><GradientButton onPress={async()=>{ let cleanCode = pairCode.trim().toUpperCase(); if (!cleanCode.startsWith('FEEL-')) cleanCode = 'FEEL-' + cleanCode.replace('FEEL-', ''); if(!cleanCode) return Alert.alert('Ошибка','Введите код'); setPendingPairData({code: cleanCode, isNew:false}); setShowGenderModal(true); }} title={loading?'...':t('join')} colors={[colors.secondary,'#48cae4']} disabled={loading}/></View>
          </View>
        )}
        {currentScreen==='main'&&(
          <View style={[styles.container,{backgroundColor:colors.bg}]}>
            <LinearGradient colors={themeMode==='light'?['#f8f9fa','#ffffff']:['#1a1a35','#2d2d55']} style={styles.header}>
              <View style={{flex:1}}><Text style={[styles.headerTitle,{color:colors.text}]} numberOfLines={1} ellipsizeMode="tail">Feel In</Text><Text style={[styles.headerCode,{color:colors.textMuted}]} numberOfLines={1}>{pairCode} {!isOnline && <Text style={{color:colors.warning}}> ●</Text>}{partnerOnline && <Text style={{color:colors.success}}> 🟢</Text>}</Text></View>
              <View style={{flexDirection:'row',gap:10}}>
                <TouchableOpacity onPress={()=>setShowSettings(true)}><Text style={{fontSize:22}}>⚙️</Text></TouchableOpacity>
                <TouchableOpacity onPress={()=>setShowProfileModal(true)}><View style={[styles.avatarBadge,{backgroundColor:myAvatarColor}]}><Text style={styles.avatarText}>{(myNickname||'Я').charAt(0).toUpperCase()}</Text></View></TouchableOpacity>
                <TouchableOpacity onPress={async()=>{if(socketRef.current)socketRef.current.disconnect(); setPairCode('');setUserRole(null);setCurrentScreen('welcome');setPeaceActive(false); await secureDel('pairData');}}><Text style={{fontSize:20}}>🚪</Text></TouchableOpacity>
              </View>
            </LinearGradient>
            <ScrollView style={styles.scroll} contentContainerStyle={{padding:12}} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>{if(socketRef.current){socketRef.current.emit('load-messages',{pairCode});socketRef.current.emit('get-profiles',{pairCode});}setRefreshing(false);}} tintColor={colors.primary}/>}>
              <View style={[styles.pulseContainer,{backgroundColor:colors.bgCard,borderColor:colors.border}]}>
                {nextDate && countdown >= 0 && (<View style={{marginBottom:10,padding:6,backgroundColor:colors.primary+'20',borderRadius:10,width:'100%'}}><Text style={{color:colors.primary,fontSize:11,fontWeight:'600',textAlign:'center'}} numberOfLines={1}>{t('nextDate')}: {nextDate.title}</Text><Text style={{color:colors.text,fontSize:14,fontWeight:'800',textAlign:'center'}}>{countdown} {t('daysLeft')}</Text></View>)}
                <Animated.View style={{transform:[{scale:pulseAnim}]}}><LinearGradient colors={[myStatus===partnerStatus&&myStatus?colors.primary:colors.textMuted,colors.primary]} style={styles.pulseHeartGradient}><Text style={styles.pulseHeart}>💓</Text></LinearGradient></Animated.View>
                <Text style={[styles.pulseText,{color:colors.text}]} numberOfLines={1}>Пульс: <Text style={{color:colors.primary,fontWeight:'800'}}>{pulseScore}%</Text></Text>
                {showSyncMessage && (<View style={styles.syncMessageContainer}><LinearGradient colors={[colors.success, '#06d6a0']} style={styles.syncMessageGradient}><Text style={{fontSize: 24}}>🎉</Text><Text style={[styles.syncMessageTitle, {color: colors.bg}]} numberOfLines={1}>{t('partnerConnected')}</Text><Text style={[styles.syncMessageText, {color: colors.bg}]} numberOfLines={2}>{t('syncMessage')}</Text></LinearGradient></View>)}
              </View>
              <LinearGradient colors={themeMode==='light'?['#f8f9fa','#ffffff']:['#1a1a35','#2d2d55']} style={styles.statCard}>
                <View style={styles.statRow}><View style={styles.statItem}><Text style={[styles.statVal,{color:colors.accent}]}>{daysTogether}</Text><Text style={[styles.statLabel,{color:colors.textSecondary}]}>{t('days')}</Text></View><View style={[styles.divider,{backgroundColor:colors.border}]}/><View style={styles.statItem}><Text style={[styles.statVal,{color:colors.warning}]} numberOfLines={1}>🔥{streak}</Text><Text style={[styles.statLabel,{color:colors.textSecondary}]}>{t('ritual')}</Text></View><View style={[styles.divider,{backgroundColor:colors.border}]}/><View style={styles.statItem}><Text style={[styles.statVal,{color:colors.secondary}]} numberOfLines={1}>💬{totalMessages}</Text><Text style={[styles.statLabel,{color:colors.textSecondary}]}>{t('messages')}</Text></View></View>
              </LinearGradient>
              <Card style={{borderColor: colors.accent, borderWidth: 1, backgroundColor: colors.bgCard}}>
                <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:10}}><Text style={[styles.cardTitle,{color:colors.text}]} numberOfLines={1}>{t('quiz')}</Text>{quizStreak > 0 && <Text style={{color:colors.warning,fontSize:11,fontWeight:'700'}} numberOfLines={1}>🔥{quizStreak}</Text>}</View>
                <Text style={{color: colors.textSecondary, marginBottom: 8, fontSize: 13}} numberOfLines={2} ellipsizeMode="tail">{quizState.question || DAILY_QUESTIONS[new Date().getDate() % DAILY_QUESTIONS.length]}</Text>
                {!quizState.answered ? (<View><TextInput style={[styles.modalInput,{backgroundColor:colors.bg,color:colors.text,borderColor:colors.border}]} placeholder={t('answer')} value={quizInput} onChangeText={setQuizInput} multiline /><GradientButton onPress={()=>{if(!quizInput.trim()||quizState.answered) return; socketRef.current?.emit('quiz-submit', { code: pairCode, user: userRole, ans: quizInput }); const today = new Date().toDateString(); const myField = userRole === 'M' ? 'ans_a' : 'ans_b'; setQuizState(prev => ({...prev, answered: true, myAns: quizInput, date: today})); AsyncStorage.setItem('dailyQuiz', JSON.stringify({...quizState, answered: true, myAns: quizInput, date: today})); setQuizStreak(prev => { const newStreak = prev + 1; AsyncStorage.setItem('quizStreak', newStreak.toString()); return newStreak; }); setQuizInput('');}} title={t('answer')} colors={[colors.accent, '#9c5cff']} /></View>) : (<View style={{backgroundColor: colors.bg, padding: 10, borderRadius: 10}}><Text style={{color: colors.textSecondary, fontSize: 11}} numberOfLines={1}>{t('answer')}: {quizState.myAns}</Text>{quizState.revealed ? (<><Text style={{color: colors.success, marginTop: 4}} numberOfLines={1}>{t('revealed')}: {quizState.partnerAns}</Text><Text style={{color:colors.primary,marginTop:6,fontSize:11,fontWeight:'600'}} numberOfLines={1}>{matchStats.matches}/{matchStats.total} {t('matchStats')}</Text></>) : (<Text style={{color: colors.warning, marginTop: 4}} numberOfLines={1}>{t('waitPartner')}</Text>)}</View>)}</Card>
              <Card style={{backgroundColor:colors.bgCard,borderColor:colors.border}}>
                <Text style={[styles.cardTitle,{color:colors.text}]} numberOfLines={1}>{t('mood')}</Text>
                <View style={styles.statusRow}>
                  <View style={[styles.statusBadge,{backgroundColor:colors.bg,borderLeftColor:myAvatarColor,borderLeftWidth:3,borderColor:colors.border}]}><Text style={[styles.statusText,{color:myAvatarColor}]} numberOfLines={1}>{t('myStatus')}</Text><Text style={styles.statusEmoji}>{myStatus||'—'}</Text></View>
                  <View style={styles.statusDivider}><Text style={[styles.dividerDot,{color:colors.textMuted}]}>•</Text></View>
                  <View style={[styles.statusBadge,{backgroundColor:colors.bg,borderLeftColor:partnerAvatarColor,borderLeftWidth:3,borderColor:colors.border}]}><Text style={[styles.statusText,{color:partnerAvatarColor}]} numberOfLines={1}>{t('partnerStatus')}</Text><Text style={styles.statusEmoji}>{partnerStatus||'—'}</Text></View>
                </View>
                {moodRecommendations.length > 0 && (<View style={{marginTop:10,padding:10,backgroundColor:colors.success+'20',borderRadius:10}}><Text style={{color:colors.success,fontSize:11,fontWeight:'600',marginBottom:2}} numberOfLines={1}>💡 {t('recommendations')}:</Text>{moodRecommendations.map((rec,i) => <Text key={i} style={{color:colors.textSecondary,fontSize:11,marginTop:1}} numberOfLines={1}>• {rec}</Text>)}</View>)}
                <View style={styles.moodGrid}>{MOOD_EMOJIS.map(item=><TouchableOpacity key={item.key} style={[styles.moodBtn,{backgroundColor:colors.bg,borderColor:colors.border},(myStatus===item.emoji||partnerStatus===item.emoji)?{backgroundColor:colors.primary+'40',borderColor:colors.primary}:{}]} onPress={()=>{socketRef.current?.emit('update-status',{code:pairCode,user:userRole,value:item.emoji}); if(userRole==='M') setStatusA(item.emoji); else setStatusB(item.emoji);}}><Text style={styles.moodEmoji}>{item.emoji}</Text></TouchableOpacity>)}</View>
              </Card>
              <Card style={{backgroundColor:colors.bgCard,borderColor:colors.border}}>
                <Text style={[styles.cardTitle,{color:colors.text}]} numberOfLines={1}>{t('chat')} {uploadingMedia&&' ⏳'}</Text>
                {/* ✅ ИСПРАВЛЕНО 4: Чат блокируется когда партнер спит */}
                {partnerSleeping ? (
                  <View style={[styles.sleepBlock,{backgroundColor:colors.bg}]}>
                    <Text style={{fontSize:40}}>🌙</Text>
                    <Text style={[styles.sleepBlockTitle,{color:colors.accent}]} numberOfLines={1}>{partnerNickname} спит</Text>
                    <Text style={{color:colors.textSecondary, fontSize:12, marginTop:4}}>Сообщения будут доставлены утром</Text>
                  </View>
                ) : (
                  <View style={[styles.chatBox,{backgroundColor:colors.bg,borderColor:colors.border}]}>
                    <FlatList ref={chatListRef} data={messages||[]} initialNumToRender={15} maxToRenderPerBatch={5} windowSize={10} removeClippedSubviews={true} keyExtractor={item=>item?.id||String(Math.random())} renderItem={({item})=>{if(!item)return null;return (<TouchableOpacity onLongPress={() => setShowReactions(item.id)} activeOpacity={0.9}><MessageBubble item={item} userRole={userRole} colors={colors} /></TouchableOpacity>);}} ListEmptyComponent={<View style={styles.chatEmptyContainer}><Text style={styles.chatEmptyIcon}>💬</Text><Text style={[styles.chatEmpty,{color:colors.textMuted}]}>{t('noMessages')}</Text></View>}/>
                    {partnerTyping&&<Text style={[styles.typingText,{color:colors.textMuted}]} numberOfLines={1}>✍️ {partnerTyping} {t('typing')}</Text>}
                  </View>
                )}
                {!partnerSleeping && (
                  <View style={styles.chatInputRow}>
                    <TouchableOpacity onPress={()=>{Alert.alert('Фото', 'В разработке');}} style={[styles.attachBtn,{backgroundColor:colors.bgCard}]}><Text style={[styles.attachText,{color: colors.textSecondary, fontWeight: '600'}]} numberOfLines={1}>📷</Text></TouchableOpacity>
                    <TextInput style={[styles.chatInput,{backgroundColor:colors.bg,color:colors.text,borderColor:colors.border}]} placeholder={t('chat')} placeholderTextColor={colors.textMuted} value={chatInput} onChangeText={setChatInput} onSubmitEditing={()=>{if(!chatInput.trim()||!socketRef.current) return; const text=chatInput.trim(); const temp={id:'temp_'+Date.now(),pair_code:pairCode,user_id:userRole,nickname:myNickname||userRole,text,read_by_partner:false,created_at:new Date().toISOString(),temp:true}; setMessages(prev=>{const u=[...(prev||[]),temp];AsyncStorage.setItem('chatMessages',JSON.stringify(u));return u;}); setChatInput(''); setTotalMessages(p=>{const n=p+1;AsyncStorage.setItem('totalMessages',n.toString());return n;}); socketRef.current.emit('send-message',{code:pairCode,user:userRole,text,nickname:myNickname||userRole});}}/>
                    <TouchableOpacity style={styles.sendBtn} onPress={()=>{if(!chatInput.trim()||!socketRef.current) return; const text=chatInput.trim(); const temp={id:'temp_'+Date.now(),pair_code:pairCode,user_id:userRole,nickname:myNickname||userRole,text,read_by_partner:false,created_at:new Date().toISOString(),temp:true}; setMessages(prev=>{const u=[...(prev||[]),temp];AsyncStorage.setItem('chatMessages',JSON.stringify(u));return u;}); setChatInput(''); setTotalMessages(p=>{const n=p+1;AsyncStorage.setItem('totalMessages',n.toString());return n;}); socketRef.current.emit('send-message',{code:pairCode,user:userRole,text,nickname:myNickname||userRole});}}><LinearGradient colors={[colors.primary,'#ff6b9d']} style={styles.sendBtnGradient}><Text style={styles.sendText}>{t('send')}</Text></LinearGradient></TouchableOpacity>
                  </View>
                )}
              </Card>
              <Card style={{backgroundColor:colors.bgCard,borderColor:colors.border}}>
                <View style={styles.cardHeader}><Text style={[styles.cardTitle,{color:colors.text}]} numberOfLines={1} style={{flex:1, marginRight: 8}}>{t('dates')}</Text><View style={{flexDirection:'row', gap:6, alignItems:'center'}}><TouchableOpacity onPress={()=>Alert.alert('Импорт', 'Только в мобильной версии')} style={[styles.importBtn]}><Text style={styles.importBtnText} numberOfLines={1}>📥</Text></TouchableOpacity><TouchableOpacity onPress={()=>setShowAddDateModal(true)} style={{paddingHorizontal:8, paddingVertical:4, backgroundColor:colors.primary+'20', borderRadius:6}}><Text style={[styles.addText,{color:colors.secondary}]} numberOfLines={1}>{t('addDate')}</Text></TouchableOpacity></View></View>
                {importantDates.length===0?<Text style={[styles.emptyText,{color:colors.textMuted}]}>{t('noDates')}</Text>:importantDates.slice(0,3).map(date=>{const ed=new Date(date.date),dl=Math.ceil((ed-new Date())/(1000*60*60*24));return(<View key={date.id} style={[styles.dateItem,{backgroundColor:colors.bg}]}><View style={styles.dateInfo}><Text style={[styles.dateTitle,{color:colors.text}]} numberOfLines={1} ellipsizeMode="tail">{date.title}</Text><Text style={[styles.dateValue,{color:colors.textSecondary}]} numberOfLines={1}>{ed.toLocaleDateString()} • {dl>0?`${dl} ${t('daysLeft')}`:t('today')}</Text></View></View>);})}
              </Card>
              <Card style={{backgroundColor:colors.bgCard,borderColor:colors.border}}>
                <Text style={[styles.cardTitle,{color:colors.text}]} numberOfLines={1}>{t('ritualCard')}</Text>
                <TextInput style={[styles.textArea,{backgroundColor:colors.bg,color:colors.text,borderColor:colors.border}]} placeholder={t('gratitude')} placeholderTextColor={colors.textMuted} value={ritualText} onChangeText={setRitualText} multiline numberOfLines={2}/>
                <GradientButton onPress={()=>{if(!ritualText.trim()||!socketRef.current) return; socketRef.current.emit('complete-ritual',{code:pairCode,user:userRole,text:ritualText}); const newHistory = [{ id: Date.now().toString(), user: userRole, text: ritualText, date: new Date().toISOString() }, ...ritualHistory].slice(0, 10); setRitualHistory(newHistory); AsyncStorage.setItem('ritualHistory', JSON.stringify(newHistory)); setRitualText('');}} title="✨ Готово" colors={[colors.success,'#06d6a0']}/>
                {ritualHistory.length > 0 && (<View style={{marginTop:12}}><Text style={{color:colors.textSecondary,fontSize:11,fontWeight:'600',marginBottom:6}} numberOfLines={1}>📜 {t('progress')}:</Text>{ritualHistory.slice(0,3).map((r,i) => (<View key={i} style={{padding:6,backgroundColor:colors.bg,borderRadius:6,marginBottom:3}}><Text style={{color:colors.textSecondary,fontSize:10}} numberOfLines={1} ellipsizeMode="tail">{r.user === userRole ? 'Вы' : 'Партнёр'}: {r.text.substring(0,40)}</Text></View>))}</View>)}
              </Card>
              <TouchableOpacity onPress={()=>{if(!socketRef.current)return; socketRef.current.emit('peace-request',{code:pairCode,user:userRole}); setPeaceActive(true); Alert.alert('🕊️ Отправлено');}} style={[styles.actionButton,{borderColor:colors.border}]}><LinearGradient colors={[colors.success,'#06d6a0']} style={styles.actionButtonGradient}><Text style={{fontSize:28,marginBottom:6}}>🕊️</Text><Text style={{color:'#fff',fontWeight:'700'}}>{t('peace')}</Text></LinearGradient></TouchableOpacity>
              
              <TouchableOpacity onPress={()=>{if(!socketRef.current)return; const newState = !mySleeping; socketRef.current.emit('sleep-toggle',{pairCode,user:userRole,active:newState}); setMySleeping(newState);}} style={[styles.actionButton,{marginTop:10,borderColor:colors.border}]}><LinearGradient colors={mySleeping ? ['#4b5563','#6b7280'] : (themeMode==='light'?['#e5e7eb','#f3f4f6']:['#1a1a35','#2d2d55'])} style={styles.actionButtonGradient}><Text style={{fontSize:28,marginBottom:6}}>{mySleeping ? '☀️' : '🌙'}</Text><Text style={{color:mySleeping ? '#fbbf24' : (themeMode==='light'?colors.textSecondary:colors.accent),fontWeight:'700'}}>{mySleeping ? t('sleepOff') : t('sleepOn')}</Text></LinearGradient></TouchableOpacity>
              <View style={{height:30}}/>
            </ScrollView>
          </View>
        )}
        {showReactions && (<Modal visible={true} transparent animationType="fade"><TouchableOpacity style={styles.modalOverlay} onPress={() => setShowReactions(null)}><View style={styles.reactionsPicker}>{['❤️','😂','','','',''].map(emoji => (<TouchableOpacity key={emoji} style={styles.reactionBtn} onPress={() => {setMessages(prev => prev.map(m => m.id === showReactions ? { ...m, reaction: emoji } : m)); setShowReactions(null);}}><Text style={{fontSize:22}}>{emoji}</Text></TouchableOpacity>))}</View></TouchableOpacity></Modal>)}
        
        <Modal visible={showGenderModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.genderModalContent,{backgroundColor:colors.bgCard,borderColor:colors.border}]}>
              <Text style={[styles.modalTitle,{color:colors.text}]} numberOfLines={1}>{pendingPairData?.isNew ? t('selectGender') : t('continue')}</Text>
              {pendingPairData?.isNew ? (
                <View style={styles.genderButtons}>
                  <TouchableOpacity onPress={() => handleJoinWithGender('M')} style={[styles.genderButton,{backgroundColor:colors.bg,borderColor:colors.border}]}><Text style={{fontSize:40,marginBottom:10}}>👨</Text><Text style={[styles.genderButtonText,{color:colors.text}]} numberOfLines={1}>{t('male')}</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => handleJoinWithGender('Ж')} style={[styles.genderButton,{backgroundColor:colors.bg,borderColor:colors.border}]}><Text style={{fontSize:40,marginBottom:10}}>👩</Text><Text style={[styles.genderButtonText,{color:colors.text}]} numberOfLines={1}>{t('female')}</Text></TouchableOpacity>
                </View>
              ) : (
                <Text style={{color:colors.textSecondary, textAlign:'center', marginBottom: 16}}>Ваш пол будет назначен автоматически (противоположный партнёру)</Text>
              )}
              <TouchableOpacity onPress={()=>{setShowGenderModal(false);setPendingPairData(null);}} style={{marginTop:16}}><Text style={[{color:colors.textSecondary,textAlign:'center'}]}>{t('cancel')}</Text></TouchableOpacity>
            </View>
          </View>
        </Modal>
        
        <Modal visible={showAddDateModal} transparent animationType="slide"><View style={styles.modalOverlay}><View style={[styles.modalContent,{backgroundColor:colors.bgCard,borderColor:colors.border}]}><Text style={[styles.modalTitle,{color:colors.text}]} numberOfLines={1}>{t('dates')}</Text><TextInput style={[styles.modalInput,{backgroundColor:colors.bg,color:colors.text,borderColor:colors.border}]} placeholder={t('dates')} value={dateTitle} onChangeText={setDateTitle}/><GradientButton onPress={()=>{if(!dateTitle.trim())return; const nd={id:Date.now().toString(),title:dateTitle,date:selectedDate.toISOString()}; const upd=[...importantDates,nd]; setImportantDates(upd); AsyncStorage.setItem('importantDates',JSON.stringify(upd)); setShowAddDateModal(false);setDateTitle('');}} title={t('save')} colors={[colors.primary,'#ff6b9d']}/><TouchableOpacity onPress={()=>setShowAddDateModal(false)} style={{marginTop:10}}><Text style={[{color:colors.textSecondary,textAlign:'center'}]}>{t('cancel')}</Text></TouchableOpacity></View></View></Modal>
        <Modal visible={showThemeModal} transparent animationType="slide"><View style={styles.modalOverlay}><View style={[styles.modalContent,{backgroundColor:colors.bgCard,borderColor:colors.border}]}><Text style={[styles.modalTitle,{color:colors.text}]} numberOfLines={1}>{t('theme')}</Text><View style={{flexDirection:'row',flexWrap:'wrap',gap:10,justifyContent:'center'}}>{Object.keys(themes).map(key => { const theme = themes[key]; const isUnlocked = key !== 'secret' || unlockedAchievements.includes('secret_theme'); const isSelected = themeMode === key; return (<TouchableOpacity key={key} disabled={!isUnlocked} onPress={() => { setThemeMode(key); AsyncStorage.setItem('themeMode', key); setShowThemeModal(false); }} style={[styles.themeOption,{backgroundColor:theme.bg,borderColor:isSelected?theme.primary:theme.border,opacity:isUnlocked?1:0.4}]}><Text style={{color:theme.text,fontSize:11,fontWeight:isSelected?'700':'400'}} numberOfLines={1} ellipsizeMode="tail">{theme.name}</Text>{!isUnlocked && <Text style={{fontSize:9,color:theme.textMuted}}>🔒</Text>}</TouchableOpacity>); })}</View><TouchableOpacity onPress={() => setShowThemeModal(false)} style={{marginTop: 14, padding: 10}}><Text style={[{color: colors.textSecondary, textAlign: 'center', fontWeight:'600'}]} numberOfLines={1}>{t('close')}</Text></TouchableOpacity></View></View></Modal>
        
        <Modal visible={showSettings} transparent animationType="slide"><View style={styles.modalOverlay}><View style={[styles.settingsContent,{backgroundColor:colors.bgCard,borderColor:colors.border}]}><View style={styles.settingsHeader}><Text style={[styles.settingsTitle,{color:colors.text}]} numberOfLines={1}>⚙️ {t('settings')}</Text><TouchableOpacity onPress={()=>setShowSettings(false)}><Text style={{fontSize:26,color:colors.textSecondary}}>✕</Text></TouchableOpacity></View><ScrollView style={{flex:1}} showsVerticalScrollIndicator={false}><View style={styles.settingSection}><Text style={[styles.settingSectionTitle,{color:colors.primary}]} numberOfLines={1}>{t('privacy')}</Text><TouchableOpacity style={styles.settingButtonModern} onPress={()=>{setDigestData({messages:totalMessages,pulse:pulseScore,streak,dates:importantDates.slice(0,3),prevPulse:0,prevMessages:0});setShowDigest(true);}}><Text style={{fontSize:22,marginRight:10}}>📊</Text><View style={{flex:1}}><Text style={[styles.settingButtonText,{color:colors.text}]} numberOfLines={1}>{t('digest')}</Text><Text style={{fontSize:11,color:colors.textSecondary}} numberOfLines={1}>Статистика</Text></View></TouchableOpacity><TouchableOpacity style={styles.settingButtonModern} onPress={()=>Alert.alert(t('exportDesc'))}><Text style={{fontSize:22,marginRight:10}}>📥</Text><View style={{flex:1}}><Text style={[styles.settingButtonText,{color:colors.text}]} numberOfLines={1}>{t('export')}</Text><Text style={{fontSize:11,color:colors.textSecondary}} numberOfLines={1}>{t('exportDesc')}</Text></View></TouchableOpacity><TouchableOpacity style={[styles.settingButtonModern,{borderColor:colors.warning}]} onPress={()=>{if(socketRef.current)socketRef.current.disconnect(); AsyncStorage.clear(); setCurrentScreen('welcome');}}><Text style={{fontSize:22,marginRight:10}}>🗑</Text><View style={{flex:1}}><Text style={[styles.settingButtonText,{color:colors.warning}]} numberOfLines={1}>{t('delete')}</Text><Text style={{fontSize:11,color:colors.textSecondary}} numberOfLines={1}>{t('deleteDesc')}</Text></View></TouchableOpacity></View><View style={styles.settingSection}><Text style={[styles.settingSectionTitle,{color:colors.primary}]} numberOfLines={1}>{t('theme')} & {t('language')}</Text><TouchableOpacity style={styles.settingButtonModern} onPress={() => setShowThemeModal(true)}><Text style={{fontSize:22,marginRight:10}}>🎨</Text><View style={{flex:1}}><Text style={[styles.settingButtonText,{color:colors.text}]} numberOfLines={1}>{t('theme')}</Text><Text style={{fontSize:11,color:colors.textSecondary}} numberOfLines={1}>{themes[themeMode].name}</Text></View><Text style={{fontSize:14,color:colors.textSecondary}}>›</Text></TouchableOpacity><View style={{flexDirection:'row',gap:10,marginTop:10}}><TouchableOpacity onPress={()=>{setLang('ru');AsyncStorage.setItem('appLang','ru')}} style={[styles.langBtn,{backgroundColor:lang==='ru'?colors.primary:colors.bg,borderColor:colors.border}]}><Text style={{color:lang==='ru'?'#fff':colors.text,fontWeight:'600'}} numberOfLines={1}>🇷 RU</Text></TouchableOpacity><TouchableOpacity onPress={()=>{setLang('en');AsyncStorage.setItem('appLang','en')}} style={[styles.langBtn,{backgroundColor:lang==='en'?colors.primary:colors.bg,borderColor:colors.border}]}><Text style={{color:lang==='en'?'#fff':colors.text,fontWeight:'600'}} numberOfLines={1}>🇬 EN</Text></TouchableOpacity></View></View><View style={styles.settingSection}><Text style={[styles.settingSectionTitle,{color:colors.primary}]} numberOfLines={1}>{t('security')}</Text><View style={styles.settingItemModern}><View style={{flexDirection:'row',alignItems:'center',flex:1}}><Text style={{fontSize:22,marginRight:10}}>🔒</Text><View style={{flex:1}}><Text style={[styles.settingLabel,{color:colors.text}]} numberOfLines={1}>{t('protection')}</Text><Text style={{fontSize:11,color:colors.textSecondary}} numberOfLines={1}>Защита</Text></View></View><TouchableOpacity style={[styles.toggle,securityEnabled&&{backgroundColor:colors.success}]} onPress={()=>{const v=!securityEnabled;setSecurityEnabled(v);AsyncStorage.setItem('securityEnabled',v.toString());}}><View style={[styles.toggleCircle,{backgroundColor:securityEnabled?'#fff':colors.textMuted},securityEnabled&&{marginLeft:20}]}/></TouchableOpacity></View></View><View style={styles.settingSection}><Text style={[styles.settingSectionTitle,{color:colors.primary}]} numberOfLines={1}>{t('notifications')}</Text><View style={styles.settingItemModern}><View style={{flexDirection:'row',alignItems:'center',flex:1}}><Text style={{fontSize:22,marginRight:10}}>🔊</Text><View style={{flex:1}}><Text style={[styles.settingLabel,{color:colors.text}]} numberOfLines={1}>{t('sounds')}</Text><Text style={{fontSize:11,color:colors.textSecondary}} numberOfLines={1}>Звуки</Text></View></View><TouchableOpacity style={[styles.toggle,soundEnabled&&{backgroundColor:colors.success}]} onPress={()=>{const v=!soundEnabled;setSoundEnabled(v);AsyncStorage.setItem('soundEnabled',v.toString());}}><View style={[styles.toggleCircle,{backgroundColor:soundEnabled?'#fff':colors.textMuted},soundEnabled&&{marginLeft:20}]}/></TouchableOpacity></View><View style={styles.settingItemModern}><View style={{flexDirection:'row',alignItems:'center',flex:1}}><Text style={{fontSize:22,marginRight:10}}>🙈</Text><View style={{flex:1}}><Text style={[styles.settingLabel,{color:colors.text}]} numberOfLines={1}>{t('hideText')}</Text><Text style={{fontSize:11,color:colors.textSecondary}} numberOfLines={2}>Скрывать текст уведомлений</Text></View></View><TouchableOpacity style={[styles.toggle,hideNotificationContent&&{backgroundColor:colors.success}]} onPress={()=>{const v=!hideNotificationContent;setHideNotificationContent(v);AsyncStorage.setItem('hideNotificationContent',v.toString());}}><View style={[styles.toggleCircle,{backgroundColor:hideNotificationContent?'#fff':colors.textMuted},hideNotificationContent&&{marginLeft:20}]}/></TouchableOpacity></View></View></ScrollView></View></View></Modal>
        <Modal visible={showDigest} transparent animationType="slide"><View style={styles.modalOverlay}><View style={[styles.modalContent,{backgroundColor:colors.bgCard,borderColor:colors.border}]}><Text style={[styles.modalTitle,{color:colors.text}]} numberOfLines={1}>{t('digestTitle')}</Text><View style={{marginVertical:10}}><Text style={{color:colors.textSecondary}} numberOfLines={1}>{t('messagesSent')}: <Text style={{color:colors.text,fontWeight:'700'}}>{digestData.messages}</Text></Text><Text style={{color:colors.textSecondary,marginTop:4}} numberOfLines={1}>{t('avgPulse')}: <Text style={{color:colors.primary,fontWeight:'700'}}>{digestData.pulse}%</Text></Text><Text style={{color:colors.textSecondary,marginTop:4}} numberOfLines={1}>{t('streakDays')}: <Text style={{color:colors.warning,fontWeight:'700'}}>{digestData.streak}</Text></Text></View><GradientButton onPress={()=>setShowDigest(false)} title="OK" colors={[colors.primary,'#ff6b9d']}/></View></View></Modal>
        <Modal visible={showProfileModal} transparent animationType="slide"><View style={styles.modalOverlay}><View style={[styles.modalContent,{backgroundColor:colors.bgCard,borderColor:colors.border}]}><Text style={[styles.modalTitle,{color:colors.text}]} numberOfLines={1}>{t('profile')}</Text><Text style={[styles.modalLabel,{color:colors.textSecondary}]}>{t('nickname')}</Text><TextInput style={[styles.modalInput,{backgroundColor:colors.bg,color:colors.text,borderColor:colors.border}]} placeholder={t('nickname')} placeholderTextColor={colors.textMuted} value={myNickname} onChangeText={t=>{setMyNickname(t);if(socketRef.current)socketRef.current.emit('update-profile',{pairCode,user:userRole,nickname:t,avatarColor:myAvatarColor});}}/><Text style={[styles.modalLabel,{color:colors.textSecondary}]}>{t('color')}</Text><View style={styles.colorPicker}>{AVATAR_COLORS.map((c, idx) => (<TouchableOpacity key={idx} style={[styles.colorDot,{backgroundColor: c,borderColor:myAvatarColor===c?'#fff':'transparent'}]} onPress={() => setMyAvatarColor(c)} />))}</View><GradientButton onPress={()=>setShowProfileModal(false)} title={t('done')} colors={[colors.primary,'#ff6b9d']}/></View></View></Modal>
      </KeyboardAvoidingView>
      <ConfettiOverlay visible={showConfetti} />
    </SafeAreaView>
  );
}

const MessageBubble = memo(({ item, userRole, colors }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current; const slideAnim = useRef(new Animated.Value(50)).current;
  useEffect(() => { Animated.parallel([Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }), Animated.spring(slideAnim, { toValue: 0, friction: 8, useNativeDriver: true })]).start(); }, []);
  return (<Animated.View style={{ opacity: fadeAnim, transform: [{ translateX: slideAnim }] }}><View style={[styles.msgBubble, item.user_id === userRole ? styles.msgMe : styles.msgPartner]}>
    {item.media_url ? <Image source={{ uri: item.media_url }} style={styles.mediaImage} /> : null}
    <Text style={[styles.msgNick, { color: colors.textSecondary }]} numberOfLines={1}>{item.nickname || item.user_id}</Text>
    <Text style={[styles.msgText, { color: colors.text }]}>{item.text}</Text>
    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 4, marginTop: 4, alignItems: 'center' }}>
      <Text style={[styles.msgTime, { color: colors.textSecondary }]}>{item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</Text>
      {item.user_id === userRole && (<Text style={styles.msgHeart}>{item.read_by_partner ? '❤️' : item.temp ? '⏳' : '🤍'}</Text>)}
      {item.reaction && <Text style={{ fontSize: 14 }}>{item.reaction}</Text>}
    </View>
  </View></Animated.View>);
});

const styles = StyleSheet.create({
  safeArea:{flex:1},container:{flex:1},loading:{flex:1,justifyContent:'center',alignItems:'center'},loadingText:{marginTop:16,fontSize:16},errorContainer:{flex:1,justifyContent:'center',alignItems:'center',padding:30},errorIcon:{fontSize:64,marginBottom:20},errorTitle:{fontSize:24,fontWeight:'700',marginBottom:20},
  onboardingContainer:{flex:1,justifyContent:'center',alignItems:'center',paddingHorizontal:40},onboardingIcon:{fontSize:80,marginBottom:24},onboardingTitle:{fontSize:28,fontWeight:'800',marginBottom:12,textAlign:'center'},onboardingDesc:{fontSize:16,textAlign:'center',lineHeight:24},dots:{flexDirection:'row',gap:8,marginVertical:32},dot:{width:8,height:8,borderRadius:4,backgroundColor:'#6b6b8a'},
  center:{flex:1,justifyContent:'center',alignItems:'center',paddingHorizontal:30},logo:{fontSize:80,marginBottom:16},title:{fontSize:48,fontWeight:'800',letterSpacing:-1,marginBottom:8},subtitle:{fontSize:18,color:'#6b7280',marginBottom:32,textAlign:'center'},
  btns:{width:'100%',gap:12},btnSecondary:{paddingVertical:18,borderRadius:16,alignItems:'center',borderWidth:1},btnSecondaryText:{fontSize:18,fontWeight:'600'},back:{padding:20},backText:{fontSize:16},sectionTitle:{fontSize:28,fontWeight:'700',marginBottom:24,textAlign:'center'},input:{width:'100%',padding:18,borderRadius:16,fontSize:24,textAlign:'center',letterSpacing:4,marginBottom:24,borderWidth:1},
  header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:16,paddingVertical:14},headerTitle:{fontSize:22,fontWeight:'800'},headerCode:{fontSize:11,marginTop:3},avatarBadge:{width:40,height:40,borderRadius:20,justifyContent:'center',alignItems:'center',borderWidth:2,borderColor:'#fff'},avatarText:{color:'#fff',fontWeight:'700',fontSize:18},scroll:{flex:1},
  statCard:{borderRadius:18,padding:16,marginBottom:14},statRow:{flexDirection:'row',justifyContent:'space-around',alignItems:'center'},statItem:{alignItems:'center'},statVal:{fontSize:26,fontWeight:'800'},statLabel:{fontSize:11,marginTop:3},divider:{width:1,height:45},
  card:{borderRadius:18,padding:16,marginBottom:14,borderWidth:1},cardHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:10},cardTitle:{fontSize:18,fontWeight:'700',marginBottom:10, flex: 1},addText:{fontSize:14,fontWeight:'600'},importBtn:{backgroundColor:'#1a1a35', paddingHorizontal:8, paddingVertical:4, borderRadius:6, borderWidth:1, borderColor:'#2a2a45'},importBtnText:{color:'#48cae4', fontSize:12, fontWeight:'600'},
  statusRow:{flexDirection:'row',justifyContent:'space-between',marginBottom:16},statusBadge:{flex:1,padding:12,borderRadius:14,borderWidth:1},statusText:{fontSize:12,fontWeight:'700',marginBottom:4},statusEmoji:{fontSize:28,textAlign:'center',marginVertical:4},statusDivider:{justifyContent:'center',paddingHorizontal:10},dividerDot:{fontSize:22},
  moodGrid:{flexDirection:'row',flexWrap:'wrap',gap:10},moodBtn:{width:(width-32-40-30)/4,aspectRatio:1,borderRadius:14,alignItems:'center',justifyContent:'center',borderWidth:2},moodEmoji:{fontSize:28},
  chatBox:{height:260,marginBottom:10,borderRadius:14,padding:10,borderWidth:1},chatEmptyContainer:{flex:1,justifyContent:'center',alignItems:'center'},chatEmptyIcon:{fontSize:50,marginBottom:10},chatEmpty:{textAlign:'center',fontSize:14,fontWeight:'600'},msgBubble:{maxWidth:'85%',padding:12,borderRadius:16,marginBottom:8},msgMe:{backgroundColor:'#ff4d6d',alignSelf:'flex-end',borderBottomRightRadius:6},msgPartner:{backgroundColor:'#1a1a35',alignSelf:'flex-start',borderBottomLeftRadius:6},mediaImage:{width:140,height:140,borderRadius:10,marginBottom:6},msgNick:{fontSize:11,fontWeight:'700',marginBottom:3,opacity:0.8},msgText:{fontSize:14},msgTime:{fontSize:9},msgHeart:{fontSize:12},typingText:{fontSize:12,fontStyle:'italic',marginTop:6},chatInputRow:{flexDirection:'row',gap:8,marginTop:10,alignItems:'center'},attachBtn:{width:44,height:44,borderRadius:12,alignItems:'center',justifyContent:'center'},attachText:{fontSize:18,fontWeight:'600'},chatInput:{flex:1,padding:12,borderRadius:14,borderWidth:1,fontSize:14},sendBtn:{width:50,borderRadius:14,overflow:'hidden'},sendBtnGradient:{width:50,height:46,justifyContent:'center',alignItems:'center'},sendText:{color:'#fff',fontSize:20,fontWeight:'700'},
  textArea:{padding:14,borderRadius:14,fontSize:14,minHeight:80,marginBottom:14,borderWidth:1},
  gradientButton:{paddingVertical:14,borderRadius:14,alignItems:'center',flexDirection:'row',justifyContent:'center'},buttonIcon:{fontSize:18,marginRight:6},buttonText:{color:'#fff',fontSize:16,fontWeight:'700'},actionButton:{borderRadius:18,overflow:'hidden',borderWidth:1},actionButtonGradient:{paddingVertical:18,alignItems:'center'},sleepBlock:{alignItems:'center',paddingVertical:35,borderRadius:14,marginBottom:10},sleepBlockTitle:{fontSize:20,fontWeight:'700',marginBottom:6},
  modalOverlay:{flex:1,backgroundColor:'rgba(0,0,0,0.85)',justifyContent:'center',alignItems:'center'},modalContent:{width:'88%',borderRadius:22,padding:24,borderWidth:1,maxHeight:'75%'},settingsContent:{width:'92%',borderRadius:22,padding:20,borderWidth:1,maxHeight:'85%'},settingsHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:20},settingsTitle:{fontSize:24,fontWeight:'800'},settingSection:{marginBottom:20},settingSectionTitle:{fontSize:14,fontWeight:'700',marginBottom:10,textTransform:'uppercase'},settingItem:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:10,borderBottomWidth:1,borderBottomColor:'#2a2a45'},settingInfo:{flex:1},settingLabel:{fontSize:14,fontWeight:'600'},settingButton:{padding:12,borderRadius:10,marginTop:10,alignItems:'center'},settingButtonText:{fontWeight:'600'},toggle:{width:48,height:30,borderRadius:15,backgroundColor:'#141428',padding:3,justifyContent:'center'},toggleCircle:{width:22,height:22,borderRadius:11},modalTitle:{fontSize:24,fontWeight:'800',marginBottom:20,textAlign:'center'},modalLabel:{fontSize:13,marginBottom:6,fontWeight:'600'},modalInput:{padding:12,borderRadius:14,marginBottom:16,borderWidth:1},
  dateItem:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',padding:10,borderRadius:10,marginBottom:6},dateInfo:{flex:1},dateTitle:{fontSize:14,fontWeight:'700'},dateValue:{fontSize:12,marginTop:2},emptyText:{textAlign:'center',padding:16},
  achievementsGridCompact:{flexDirection:'row',flexWrap:'wrap',gap:6,padding:3},achievementItemCompact:{width:65,height:65,borderRadius:10,alignItems:'center',justifyContent:'center',padding:3,borderWidth:2},achievementIconSmall:{fontSize:22,marginBottom:2},achievementTitleSmall:{fontSize:8,textAlign:'center',fontWeight:'600'},
  pinContainer:{flex:1,justifyContent:'center',alignItems:'center'},pinIcon:{fontSize:64,marginBottom:24},pinTitle:{fontSize:24,fontWeight:'700',marginBottom:32},pinInputContainer:{flexDirection:'row',gap:16,marginBottom:32},pinDot:{width:16,height:16,borderRadius:8},pinInputHidden:{position:'absolute',opacity:0,width:1,height:1},pinCancel:{fontSize:16},
  pulseContainer:{alignItems:'center',paddingVertical:20,marginBottom:14,borderRadius:18,borderWidth:1},pulseHeartGradient:{width:80,height:80,borderRadius:40,justifyContent:'center',alignItems:'center',marginBottom:10},pulseHeart:{fontSize:46},pulseText:{fontSize:18,fontWeight:'800'},
  syncMessageContainer: { position: 'absolute', top: 70, left: 16, right: 16, zIndex: 1000 },
  syncMessageGradient: { padding: 16, borderRadius: 18, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  syncMessageTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  syncMessageText: { fontSize: 13, textAlign: 'center', marginTop: 6, opacity: 0.9 },
  genderModalContent: { width: '88%', borderRadius: 22, padding: 28, borderWidth: 1 }, genderButtons: { flexDirection: 'row', gap: 16, justifyContent: 'center', marginTop: 16 }, genderButton: { flex: 1, padding: 20, borderRadius: 14, alignItems: 'center', borderWidth: 2 }, genderButtonText: { fontSize: 14, fontWeight: '600' },
  settingButtonModern: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: '#ffffff10', borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: '#2a2a45' }, settingItemModern: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: '#ffffff10', borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: '#2a2a45' }, langBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', borderWidth: 2 },
  themeOption: { width: 90, height: 55, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2 }, confettiContainer: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 9999, pointerEvents: 'none' }, colorPicker: { flexDirection: 'row', gap: 10, marginTop: 6, justifyContent: 'center' }, colorDot: { width: 32, height: 32, borderRadius: 16, borderWidth: 3 },
  reactionsPicker: { flexDirection: 'row', gap: 14, padding: 18, backgroundColor: '#141428', borderRadius: 18, borderWidth: 1, borderColor: '#2a2a45' }, reactionBtn: { padding: 10, borderRadius: 10, backgroundColor: '#0a0a14' }
});

export default function App() { return <ErrorBoundary><AppContent /></ErrorBoundary>; }