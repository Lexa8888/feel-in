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
import * as Sentry from '@sentry/react-native';
import * as Updates from 'expo-updates';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as Localization from 'expo-localization';

Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: true }) });

const CONFIG = { SERVER_URL: 'https://feel-in.onrender.com', SUPABASE_URL: 'https://jgpcuebyysxkrdqkvqmz.supabase.co', SUPABASE_ANON_KEY: 'sb_publishable_xQWX7_juECMQlPzwW-cb9w_CLszetYD', EXPO_PROJECT_ID: '0636e412-9635-4a63-a35d-bf97572f3861', PAIR_CODE_PREFIX: 'FEEL-' };
const { width, height } = Dimensions.get('window');
const IS_WEB = Platform.OS === 'web';

const translations = {
  ru: { welcome: "Feel In", createPair: "✨ Создать пару", join: "🔑 Войти по коду", codeLabel: "Введите код пары", back: "← Назад", days: "Дней вместе", ritual: "Ритуал", messages: "Сообщения", mood: "😊 Настроение", chat: "💬 Чат", dates: "📅 Даты", achievements: "🏆 Достижения", ritualCard: "✨ Ритуал дня", peace: "🕊️ Мир", sleep: "🌙 Спокойной ночи", settings: "⚙️ Настройки", security: "🔐 Безопасность", notifications: "🔊 Уведомления", privacy: "🛡️ Приватность", export: "📥 Экспорт данных", delete: "🗑 Удалить аккаунт", theme: "🎨 Тема", language: "🌍 Язык", light: "Светлая", dark: "Тёмная", russian: "Русский", english: "English", quiz: "🎮 Вопрос дня", answer: "Ответить", waitPartner: "Ждём ответ партнёра...", revealed: "Ответы открыты!", haptic: "💓 Love", noMessages: "Начните общение прямо сейчас", typing: "печатает...", send: "➤", attach: "📷 Фото", gratitude: "За что вы благодарны сегодня?", writeThoughts: "Ваши мысли...", save: "💾 Сохранить", cancel: "Отмена", addDate: "+ Добавить дату", importCalendar: "📥 Импорт из календаря", noDates: "Пока нет важных дат", today: "Сегодня!", daysLeft: "дней осталось", profile: "👤 Профиль", nickname: "Ваш никнейм", color: "Цвет аватара", done: "Готово", protection: "Защита приложения", faceId: "Face ID / Touch ID", changePin: "🔑 Сменить PIN-код", sounds: "🔔 Звуки уведомлений", hideText: "🙈 Скрывать текст уведомлений", digest: "📊 Еженедельный дайджест", digestTitle: "Ваша неделя в Feel In", messagesSent: "Отправлено сообщений", avgPulse: "Средний пульс пары", streakDays: "Дней ритуала", datesUpcoming: "Ближайшие даты", exportDesc: "Скачать все данные в JSON", deleteDesc: "Удалить аккаунт и все данные", deleteConfirm: "Удалить аккаунт навсегда?", exportSuccess: "Данные сохранены", deleteSuccess: "Аккаунт удалён", importTitle: "Импорт из календаря", close: "Закрыть", noEvents: "Нет событий в календаре", nextDate: "Следующее событие", countdown: "через", weekReport: "Отчёт за неделю", moodImproved: "Настроение улучшилось", recommendations: "Рекомендации", streak: "Серия", matchStats: "Совпадения ответов", themeUnlocked: "Тема открыта!", progress: "История ритуалов", secret: "Секретная тема", joinPair: "Вступить в пару", createNewPair: "Создать новую пару", yourCode: "Ваш код пары", partner: "Партнёр", you: "Вы", online: "онлайн", offline: "офлайн" },
  en: { welcome: "Feel In", createPair: "✨ Create Pair", join: "🔑 Join by Code", codeLabel: "Enter Pair Code", back: "← Back", days: "Days together", ritual: "Ritual", messages: "Messages", mood: "😊 Mood", chat: "💬 Chat", dates: "📅 Dates", achievements: "🏆 Achievements", ritualCard: "✨ Daily Ritual", peace: "🕊️ Peace", sleep: "🌙 Good night", settings: "⚙️ Settings", security: "🔐 Security", notifications: "🔊 Notifications", privacy: "🛡️ Privacy", export: "📥 Export Data", delete: "🗑 Delete Account", theme: "🎨 Theme", language: "🌍 Language", light: "Light", dark: "Dark", russian: "Russian", english: "English", quiz: "🎮 Daily Quiz", answer: "Answer", waitPartner: "Waiting for partner...", revealed: "Answers revealed!", haptic: "💓 Love", noMessages: "Start chatting now", typing: "typing...", send: "➤", attach: "📷 Photo", gratitude: "What are you grateful for?", writeThoughts: "Your thoughts...", save: "💾 Save", cancel: "Cancel", addDate: "+ Add Date", importCalendar: "📥 Import Calendar", noDates: "No dates yet", today: "Today!", daysLeft: "days left", profile: "👤 Profile", nickname: "Your Nickname", color: "Avatar Color", done: "Done", protection: "App Protection", faceId: "Face ID / Touch ID", changePin: "🔑 Change PIN", sounds: "🔔 Notification Sounds", hideText: "🙈 Hide Notification Text", digest: "📊 Weekly Digest", digestTitle: "Your Week in Feel In", messagesSent: "Messages sent", avgPulse: "Couple's avg pulse", streakDays: "Ritual streak", datesUpcoming: "Upcoming dates", exportDesc: "Download all data as JSON", deleteDesc: "Delete account and all data", deleteConfirm: "Delete account forever?", exportSuccess: "Data saved", deleteSuccess: "Account deleted", importTitle: "Import from Calendar", close: "Close", noEvents: "No calendar events", nextDate: "Next event", countdown: "in", weekReport: "Weekly Report", moodImproved: "Mood improved", recommendations: "Recommendations", streak: "Streak", matchStats: "Answer matches", themeUnlocked: "Theme unlocked!", progress: "Ritual history", secret: "Secret theme", joinPair: "Join Pair", createNewPair: "Create New Pair", yourCode: "Your pair code", partner: "Partner", you: "You", online: "online", offline: "offline" }
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

const MOOD_RECOMMENDATIONS = { 
  happy: ["📸 Скиньте партнёру фото хорошего момента", "📅 Запланируйте совместное свидание", "💌 Напишите, что вас радует"], 
  sad: ["💓 Отправьте пульс любви", "💌 Напишите тёплое сообщение", "🤗 Попросите поддержки у партнёра"], 
  love: ["✨ Сделайте ежедневный ритуал", "📝 Запишите чувства в дневник", "🎁 Приготовьте маленький сюрприз"], 
  hug: ["🫂 Отправьте виртуальные объятия", "💬 Расскажите, почему цените партнёра", "🎵 Включите вашу песню"], 
  adore: ["💖 Напишите комплимент", "🌹 Вспомните первое свидание", "💫 Поделитесь мечтой"], 
  angry: ["🧘 Сделайте глубокий вдох", "💬 Обсудите, что беспокоит", "🕊️ Нажмите кнопку «Мир»", "⏸️ Сделайте паузу перед ответом"], 
  sleepy: ["🌙 Пожелайте спокойной ночи", "😴 Включите режим сна", "🎧 Отправьте колыбельную", "💤 Отдохните, утро мудренее"], 
  celebrate: ["🎊 Поделитесь радостью с партнёром", "🥂 Запланируйте праздник", "📸 Сделайте совместное фото", "🎁 Приготовьте сюрприз"] 
};

const AVATAR_COLORS = ['#ff4d6d', '#48cae4', '#c77dff', '#06d6a0', '#ffd166', '#ff9f43'];
const ACHIEVEMENTS = [ 
  { id: 'first_message', title: 'first_message', icon: '💬', cond: s => s.totalMessages >= 1 }, 
  { id: 'seven_days', title: 'seven_days', icon: '🔥', cond: s => s.streak >= 7 }, 
  { id: 'hundred_messages', title: 'hundred_messages', icon: '💯', cond: s => s.totalMessages >= 100 }, 
  { id: 'first_peace', title: 'first_peace', icon: '🕊️', cond: s => s.peaceSent >= 1 }, 
  { id: 'month_together', title: 'month_together', icon: '💕', cond: s => s.daysTogether >= 30 }, 
  { id: 'perfect_pulse', title: 'perfect_pulse', icon: '💯', cond: s => s.pulseScore >= 100 }, 
  { id: 'quiz_master', title: 'quiz_master', icon: '🧠', cond: s => s.quizStreak >= 7 }, 
  { id: 'secret_theme', title: 'secret_theme', icon: '🔮', cond: s => s.totalMessages >= 500 } 
];
const DAILY_QUESTIONS = [ "Какое наше самое яркое воспоминание? 📸", "За что ты меня ценишь? 💖", "Куда бы полетели сейчас? ✈️", "Что заставляет улыбаться? 😊", "Идеальный вечер? 🍷", "Что попробовать вместе? 🎢", "За что благодарен сегодня? 🙏", "Лучшее качество во мне? ✨", "Песня для нас? 🎵", "Чувства рядом? 🫂" ];

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() { if (this.state.hasError) return <SafeAreaView style={styles.safeArea}><View style={styles.center}><Text style={styles.errorIcon}>😕</Text><Text style={[styles.errorTitle,{color:colors.text}]}>Ошибка</Text><TouchableOpacity onPress={() => this.setState({ hasError: false })} style={{marginTop:20, backgroundColor:colors.primary, padding:15, borderRadius:10}}><Text style={{color:'#fff', fontWeight:'700'}}>Перезапустить</Text></TouchableOpacity></View></SafeAreaView>; return this.props.children; }
}

const GradientButton = memo(({ onPress, title, colors: gradColors, icon, disabled, style }) => {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <TouchableOpacity activeOpacity={0.9} onPressIn={() => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start()} onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()} onPress={onPress} disabled={disabled} style={[{opacity: disabled?0.5:1}, style]}>
      <Animated.View style={{transform:[{scale}]}}>
        <LinearGradient colors={gradColors} style={styles.gradientButton}>
          {icon && <Text style={styles.buttonIcon}>{icon}</Text>}
          <Text style={styles.buttonText}>{title}</Text>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
});

const Card = memo(({children, style}) => <View style={[styles.card, style]}>{children}</View>);

const ConfettiOverlay = ({ visible }) => {
  const [particles, setParticles] = useState([]);
  useEffect(() => {
    if (visible) {
      const newParticles = Array.from({ length: 30 }).map((_, i) => ({ id: i, x: Math.random() * width, y: -50, speed: 3 + Math.random() * 5, rotation: Math.random() * 360, emoji: ['💖', '✨', '🎉', ''][Math.floor(Math.random() * 4)] }));
      setParticles(newParticles);
      setTimeout(() => setParticles([]), 2500);
    }
  }, [visible]);
  if (particles.length === 0) return null;
  return (<View style={styles.confettiContainer} pointerEvents="none">{particles.map(p => <AnimatedConfetti key={p.id} config={p} />)}</View>);
};
const AnimatedConfetti = ({ config }) => {
  const animY = useRef(new Animated.Value(config.y)).current;
  const animRot = useRef(new Animated.Value(config.rotation)).current;
  const durationValue = 2000;
  const rotationValue = 360;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(animY, { toValue: 800, duration: durationValue / config.speed * 2, useNativeDriver: true }),
      Animated.timing(animRot, { toValue: config.rotation + rotationValue, duration: durationValue, useNativeDriver: true })
    ]).start();
  }, []);
  return (<Animated.View style={{ position: 'absolute', left: config.x, top: animY, transform: [{ rotate: animRot.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] }) }] }}><Text style={{ fontSize: 24 }}>{config.emoji}</Text></Animated.View>);
};

const REMINDER_TASK = 'feel-in-reminders';
const DIGEST_TASK = 'feel-in-weekly-digest';
TaskManager.defineTask(REMINDER_TASK, async () => { try { return BackgroundFetch.BackgroundFetchResult.NewData; } catch { return BackgroundFetch.BackgroundFetchResult.Failed; } });
TaskManager.defineTask(DIGEST_TASK, async () => { try { return BackgroundFetch.BackgroundFetchResult.NewData; } catch { return BackgroundFetch.BackgroundFetchResult.Failed; } });

function AppContent() {
  const [currentScreen, setCurrentScreen] = useState('welcome');
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const [pairCode, setPairCode] = useState('');
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusA, setStatusA] = useState('');
  const [statusB, setStatusB] = useState('');
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
  const [moodHistory, setMoodHistory] = useState([]);
  const [streak, setStreak] = useState(0);
  const [totalMessages, setTotalMessages] = useState(0);
  const [partnerSleeping, setPartnerSleeping] = useState(false);
  const [pulseScore, setPulseScore] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [securityEnabled, setSecurityEnabled] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
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
  const [showHapticWidget, setShowHapticWidget] = useState(true);
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
  
  const colors = themes[themeMode];
  const t = useCallback((key) => translations[lang][key] || key, [lang]);

  const hapticScale = useRef(new Animated.Value(1)).current;
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = useRef(10);
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

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      try {
        if (!__DEV__ && !IS_WEB && typeof Updates.checkForUpdateAsync === 'function') {
          try { const u = await Updates.checkForUpdateAsync(); if (u.isAvailable) { await Updates.fetchUpdateAsync(); await Updates.reloadAsync(); } } catch (e) { console.log('Updates skipped'); }
        }
        const seen = await AsyncStorage.getItem('hasSeenOnboarding'); if (seen) setHasSeenOnboarding(true);
        const sec = await secureGet('securityEnabled'); const bio = await secureGet('biometricEnabled'); const pin = await secureGet('pinCode');
        const ach = await AsyncStorage.getItem('unlockedAchievements'); const snd = await AsyncStorage.getItem('soundEnabled'); const hid = await AsyncStorage.getItem('hideNotificationContent');
        const dates = await AsyncStorage.getItem('importantDates'); const pairData = await secureGet('pairData');
        const savedQuiz = await AsyncStorage.getItem('dailyQuiz'); const savedTheme = await AsyncStorage.getItem('themeMode'); const savedLang = await AsyncStorage.getItem('appLang');
        const savedRituals = await AsyncStorage.getItem('ritualHistory'); const savedQuizStreak = await AsyncStorage.getItem('quizStreak'); const savedMatchStats = await AsyncStorage.getItem('matchStats');
        if (savedTheme) setThemeMode(savedTheme); if (savedLang) setLang(savedLang);
        if (savedQuiz) { const parsed = JSON.parse(savedQuiz); const today = new Date().toDateString(); if (parsed.date === today) setQuizState(parsed); }
        if (savedRituals) setRitualHistory(JSON.parse(savedRituals)); if (savedQuizStreak) setQuizStreak(parseInt(savedQuizStreak)); if (savedMatchStats) setMatchStats(JSON.parse(savedMatchStats));
        if (sec) setSecurityEnabled(sec === 'true'); if (bio) setBiometricEnabled(bio === 'true'); if (pin) setPinCode(pin);
        if (ach) setUnlockedAchievements(JSON.parse(ach)); if (snd !== null) setSoundEnabled(snd === 'true'); if (hid) setHideNotificationContent(hid === 'true');
        if (dates) setImportantDates(JSON.parse(dates));
        if (pairData && isMounted) {
          const p = JSON.parse(pairData); setPairCode(p.pairCode); setUserRole(p.userRole);
          if ((sec === 'true' || bio === 'true') && pin) setShowPinScreen(true); else { setCurrentScreen('main'); connectSocket(p.pairCode); }
        }
        const start = await AsyncStorage.getItem('relationshipStart'); if (start) setDaysTogether(Math.max(0, Math.floor((Date.now() - new Date(start)) / 86400000)));
        const s = await AsyncStorage.getItem('ritualStreak'); const m = await AsyncStorage.getItem('chatMessages'); const tVal = await AsyncStorage.getItem('totalMessages');
        const n = await AsyncStorage.getItem('myNickname'); const c = await AsyncStorage.getItem('myAvatarColor');
        if (s) setStreak(parseInt(s)); if (m) setMessages(JSON.parse(m)); if (tVal) setTotalMessages(parseInt(tVal)); if (n) setMyNickname(n); if (c) setMyAvatarColor(c);
        if (!IS_WEB) { await BackgroundFetch.registerTaskAsync(REMINDER_TASK, { minimumInterval: 15 * 60 }); await BackgroundFetch.registerTaskAsync(DIGEST_TASK, { minimumInterval: 24 * 60 * 60 }); }
        const url = await Linking.getInitialURL(); if (url) handleDeepLink(url);
        if (isMounted) { setIsInitialized(true); Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: !IS_WEB }).start(); }
      } catch (e) { console.error(e); if (isMounted) { setIsInitialized(true); setCurrentScreen('welcome'); } }
    };
    init();
    const sub = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));
    return () => { isMounted = false; sub.remove(); if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current); };
  }, []);

  useEffect(() => { const sub = Appearance.addChangeListener(({ colorScheme }) => { if (themeMode === 'system') setThemeMode(colorScheme === 'dark' ? 'dark' : 'light'); }); return () => sub.remove(); }, []);
  const handleDeepLink = (url) => { if (url.includes('join=')) { const code = url.split('join=')[1]; setPairCode(code); setCurrentScreen('join'); } };

  const connectSocket = useCallback((code) => {
    if (socketRef.current) { 
      socketRef.current.disconnect(); 
      socketRef.current = null; 
    }
    
    console.log('🔌 Connecting to socket with code:', code, 'userRole:', userRole);
    
    try {
      const newSocket = io(CONFIG.SERVER_URL, { 
        transports: ['websocket', 'poll'], 
        reconnection: true,
        reconnectionDelay: 1000, 
        reconnectionDelayMax: 5000, 
        timeout: 20000 
      });
      
      newSocket.on('connect', () => {
        console.log('✅ Socket connected:', newSocket.id);
        setIsOnline(true);
        
        newSocket.emit('join-pair', code);
        console.log('👥 Joined pair room:', code);
        
        newSocket.emit('get-profiles', { pairCode: code });
        newSocket.emit('load-messages', { pairCode: code });
        newSocket.emit('load-mood-history', { pairCode: code });
        
        if (myNickname) {
          newSocket.emit('update-profile', { 
            pairCode: code, 
            user: userRole, 
            nickname: myNickname, 
            avatarColor: myAvatarColor 
          });
        }
      });
      
      newSocket.on('disconnect', () => { 
        console.log('❌ Socket disconnected');
        setIsOnline(false); 
      });
      
      newSocket.on('connect_error', (err) => { 
        console.error('❌ Socket connection error:', err);
        setIsOnline(false); 
      });
      
      newSocket.on('profiles-loaded', (p) => { 
        console.log('📊 Profiles loaded:', p);
        if(!p) return; 
        const me = p.find(x => x.user_id === userRole);
        const ot = p.find(x => x.user_id !== userRole); 
        if(me) {
          setMyNickname(me.nickname || 'Я');
          setMyAvatarColor(me.avatar_color || AVATAR_COLORS[0]);
        } 
        if(ot) {
          setPartnerNickname(ot.nickname || 'Партнёр');
          setPartnerAvatarColor(ot.avatar_color || AVATAR_COLORS[1]);
        } 
      });
      
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
            const c = hideNotificationContent
              ? { title: '💬 Сообщение', body: 'Нажмите' }
              : { title: `💬 ${msg.nickname || 'Партнёр'}`, body: msg.media_type ? '📎 Вложение' : msg.text };
            await Notifications.scheduleNotificationAsync({ 
              content: { ...c, sound: soundEnabled ? 'default' : null }, 
              trigger: null 
            });
          }
        }
      });

      newSocket.on('message-sent', (msg) => { 
        console.log('✅ Message sent:', msg);
        if(!msg) return; 
        setMessages(prev => {
          const f = (prev || []).filter(x => !x.temp);
          const u = [...f, msg];
          AsyncStorage.setItem('chatMessages', JSON.stringify(u));
          return u;
        });
        checkAchievements(); 
      });
      
      newSocket.on('message-read', (d) => { 
        if(!d || !d.messageId) return; 
        setMessages(p => (p || []).map(m => m.id === d.messageId ? {...m, read_by_partner: true} : m)); 
      });
      
      newSocket.on('partner-typing', (d) => {
        if(!d) return;
        setPartnerTyping(d.nickname || 'Партнёр');
      });
      
      newSocket.on('partner-stopped-typing', () => {
        setPartnerTyping('');
      });
      
      newSocket.on('status-updated', (d) => {
        console.log('😊 Status updated:', d);
        if(!d) return;
        if(d.user === 'M') setStatusA(d.value);
        else setStatusB(d.value);
      });
      
      newSocket.on('mood-history-loaded', (h) => {
        setMoodHistory(h || []);
      });
      
      newSocket.on('peace-updated', (d) => {
        if(!d) return;
        setPeaceActive(d.active);
        if(d.active) checkAchievements();
      });
      
      newSocket.on('streak-updated', (d) => {
        if(!d || d.streak === undefined) return;
        setStreak(d.streak);
        AsyncStorage.setItem('ritualStreak', d.streak.toString());
        checkAchievements();
      });
      
      newSocket.on('sleep-updated', (p) => {
        if(!p) return;
        const a = p.active === true;
        const u = p.user || null;
        setPartnerSleeping(u && u !== userRole && a);
      });
      
      newSocket.on('quiz-updated', ({ quiz }) => {
        if (!quiz) return;
        const today = new Date().toDateString(); 
        const questionIdx = new Date().getDate() % DAILY_QUESTIONS.length; 
        const question = DAILY_QUESTIONS[questionIdx];
        const updatedState = { 
          date: today, 
          question, 
          answered: quiz[`ans_${userRole === 'M' ? 'a' : 'b'}`] ? true : quizState.answered, 
          revealed: quiz.revealed, 
          myAns: quiz[`ans_${userRole === 'M' ? 'a' : 'b'}`] || quizState.myAns, 
          partnerAns: quiz[`ans_${userRole === 'M' ? 'b' : 'a'}`] || quizState.partnerAns 
        };
        setQuizState(updatedState); 
        AsyncStorage.setItem('dailyQuiz', JSON.stringify(updatedState));
        if (updatedState.revealed && updatedState.answered) {
          const newMatch = quiz[`ans_${userRole === 'M' ? 'a' : 'b'}`] === quiz[`ans_${userRole === 'M' ? 'b' : 'a'}`];
          setMatchStats(prev => { 
            const updated = { total: prev.total + 1, matches: prev.matches + (newMatch ? 1 : 0) }; 
            AsyncStorage.setItem('matchStats', JSON.stringify(updated)); 
            return updated; 
          });
          Alert.alert('🔓 Ответы!', `Ты: ${updatedState.myAns}\nПартнёр: ${updatedState.partnerAns}${newMatch ? '\n✨ Совпадение!' : ''}`);
          if (newMatch && !IS_WEB) triggerConfetti();
        }
      });
      
      newSocket.on('receive-haptic-pulse', ({ from }) => { 
        if (!IS_WEB) { 
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); 
          setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 300); 
          Alert.alert('💓 Любовь', `${from} отправил пульс!`); 
        } 
      });
      
      socketRef.current = newSocket;
    } catch(e) {
      console.error('❌ Socket connection failed:', e);
      setHasError(true);
    }
  }, [myNickname, quizState, hideNotificationContent, soundEnabled, userRole]);

  const attemptReconnect = useCallback((code) => { if(reconnectAttempts.current>=maxReconnectAttempts.current) return; const delay=Math.min(1000*Math.pow(2,reconnectAttempts.current),30000); reconnectTimeout.current=setTimeout(()=>{reconnectAttempts.current+=1;connectSocket(code);},delay); }, [connectSocket]);
  const checkAchievements = useCallback(async () => { const stats={totalMessages,streak,daysTogether,peaceSent:peaceActive?1:0,pulseScore,quizStreak}; const newA=[...unlockedAchievements]; let has=false; ACHIEVEMENTS.forEach(a=>{if(!newA.includes(a.id)&&a.cond(stats)){newA.push(a.id);has=true;Alert.alert('🏆 Достижение',`${a.icon} ${t(a.title)}`); if(themeMode==='dark' && a.id==='secret_theme') { setThemeMode('secret'); AsyncStorage.setItem('themeMode','secret'); Alert.alert(t('themeUnlocked')); }}}); if(has){setUnlockedAchievements(newA);await AsyncStorage.setItem('unlockedAchievements',JSON.stringify(newA));} }, [unlockedAchievements, totalMessages, streak, daysTogether, peaceActive, pulseScore, quizStreak, t, themeMode]);
  useEffect(() => { let sc=0; if(statusA&&statusB&&statusA===statusB)sc+=40; else if(statusA||statusB)sc+=15; sc+=Math.min(streak*3,30); sc+=Math.min((messages?.length||0)*0.25,30); sc=Math.min(Math.max(sc,0),100); setPulseScore(sc); if(animationRef.current)animationRef.current.stop(); if(sc>5){const dur=2000-(sc/100)*800,sc2=1.1+(sc/100)*0.3;const lp=Animated.loop(Animated.sequence([Animated.timing(pulseAnim,{toValue:sc2,duration:dur,useNativeDriver:!IS_WEB}),Animated.timing(pulseAnim,{toValue:1,duration:dur,useNativeDriver:!IS_WEB})]));lp.start();animationRef.current=lp;} else pulseAnim.setValue(1); },[statusA,statusB,streak,messages?.length]);
  const onRefresh = useCallback(async () => { setRefreshing(true); try{if(socketRef.current){socketRef.current.emit('load-messages',{pairCode});socketRef.current.emit('get-profiles',{pairCode});}}finally{setRefreshing(false);} }, []);
  const fetchCalendarEvents = useCallback(async () => { if (IS_WEB) return Alert.alert('Мобильно', 'Работает только на телефоне'); setCalendarLoading(true); try { const { status } = await Calendar.requestCalendarPermissionsAsync(); if (status !== 'granted') { Alert.alert('Нет доступа', 'Разрешите в настройках'); setCalendarLoading(false); return; } const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT); const defaultCalendar = calendars.find(c => c.allowsModifications && c.isPrimary) || calendars[0]; if (!defaultCalendar) { Alert.alert('Ошибка', 'Нет календарей'); setCalendarLoading(false); return; } const now = new Date(); const future = new Date(); future.setDate(future.getDate() + 30); const events = await Calendar.getEventsAsync([defaultCalendar.id], now, future); const formatted = events.filter(e => e.title && !importantDates.some(d => d.title === e.title && new Date(d.date).toDateString() === new Date(e.startDate).toDateString())).slice(0, 15).map(e => ({ id: e.id, title: e.title, date: new Date(e.startDate).toISOString(), isAllDay: e.allDay })); setCalendarEvents(formatted); setShowCalendarImport(true); } catch (e) { Alert.alert('Ошибка', 'Не удалось загрузить'); } finally { setCalendarLoading(false); } }, [importantDates]);
  const importEvent = useCallback((event) => { const newDate = { id: Date.now().toString() + event.id, title: event.title, date: event.date }; setImportantDates(prev => { const updated = [...prev, newDate]; AsyncStorage.setItem('importantDates', JSON.stringify(updated)); return updated; }); setCalendarEvents(prev => prev.filter(e => e.id !== event.id)); if (!IS_WEB) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }, []);
  const generateDigest = useCallback(async () => { const avgPulse = pulseScore > 0 ? pulseScore : Math.floor(Math.random() * 40) + 60; const upcomingDates = importantDates.filter(d => { const diff = Math.ceil((new Date(d.date) - new Date()) / 86400000); return diff >= 0 && diff <= 7; }).slice(0, 3); const prevDigest = await AsyncStorage.getItem('lastDigest'); let prevData = { pulse: 50, messages: 0 }; if (prevDigest) prevData = JSON.parse(prevDigest); setDigestData({ messages: totalMessages, pulse: avgPulse, streak, dates: upcomingDates, prevPulse: prevData.pulse, prevMessages: prevData.messages }); setShowDigest(true); await AsyncStorage.setItem('lastDigest', JSON.stringify({ pulse: avgPulse, messages: totalMessages })); }, [pulseScore, importantDates, totalMessages, streak]);
  const exportData = useCallback(async () => { try { const data = { pairCode, userRole, myNickname, partnerNickname, messages, importantDates, unlockedAchievements, stats: { daysTogether, streak, totalMessages, pulseScore }, exportedAt: new Date().toISOString() }; const uri = `${FileSystem.documentDirectory}feel-in-data.json`; await FileSystem.writeAsStringAsync(uri, JSON.stringify(data, null, 2)); await Share.share({ url: uri, title: 'Feel In Data' }); Alert.alert(t('exportSuccess')); } catch (e) { Alert.alert('Error', e.message); } }, [pairCode, userRole, myNickname, partnerNickname, messages, importantDates, unlockedAchievements, daysTogether, streak, totalMessages, pulseScore, t]);
  const deleteAccount = useCallback(() => { Alert.alert(t('delete'), t('deleteConfirm'), [ { text: t('cancel'), style: 'cancel' }, { text: t('delete'), style: 'destructive', onPress: async () => { try { if (socketRef.current) socketRef.current.disconnect(); await fetch(`${CONFIG.SERVER_URL}/api/user/delete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pairCode }) }); await AsyncStorage.clear(); setCurrentScreen('welcome'); Alert.alert(t('deleteSuccess')); } catch (e) { Alert.alert('Error', e.message); } } } ]); }, [t, pairCode]);

  const pickAndSendMedia = useCallback(async (type) => {
    if (!socketRef.current) return Alert.alert('Ошибка', 'Нет соединения с сервером');
    try {
      let result;
      if (type === 'image') { const perm = await ImagePicker.requestMediaLibraryPermissionsAsync(); if (perm.status !== 'granted') return Alert.alert('Нет доступа', 'Разрешите доступ к галерее'); result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 3], quality: 0.8 }); }
      if (!result.canceled && result.assets[0]) {
        setUploadingMedia(true); const file = result.assets[0];
        if (IS_WEB) {
          socketRef.current.emit('send-message', { code: pairCode, user: userRole, text: '📎 Фото', nickname: myNickname || userRole, mediaUrl: file.uri, mediaType: type });
          setMessages(prev => [...prev, { id: 'temp_' + Date.now(), pair_code: pairCode, user_id: userRole, nickname: myNickname || userRole, text: '📎 Фото', media_url: file.uri, media_type: type, read_by_partner: false, created_at: new Date().toISOString(), temp: true }]);
          setUploadingMedia(false); return;
        }
        try {
          const base64 = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
          const res = await fetch(`${CONFIG.SERVER_URL}/api/upload-media`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileBase64: base64, fileName: `${Date.now()}.${file.type?.split('/')[1] || 'jpg'}`, mimeType: file.mimeType || 'image/jpeg' }) });
          const data = await res.json();
          if (data.success) {
            socketRef.current.emit('send-message', { code: pairCode, user: userRole, text: '', nickname: myNickname || userRole, mediaUrl: data.url, mediaType: type });
            setMessages(prev => [...prev, { id: 'temp_' + Date.now(), pair_code: pairCode, user_id: userRole, nickname: myNickname || userRole, text: '📎 Вложение', media_url: data.url, media_type: type, read_by_partner: false, created_at: new Date().toISOString(), temp: true }]);
          } else { Alert.alert('Ошибка', 'Не удалось загрузить фото'); }
        } catch (uploadErr) { console.error('Upload error:', uploadErr); Alert.alert('Ошибка', 'Не удалось отправить фото'); }
        setUploadingMedia(false);
      }
    } catch (e) { console.error('Pick media error:', e); setUploadingMedia(false); Alert.alert('Ошибка', 'Не удалось выбрать фото'); }
  }, [pairCode, userRole, myNickname]);

  const sendMessage = useCallback(async () => { if(!chatInput.trim()||!socketRef.current||partnerSleeping) return; const text=chatInput.trim(); const temp={id:'temp_'+Date.now(),pair_code:pairCode,user_id:userRole,nickname:myNickname||userRole,text,read_by_partner:false,created_at:new Date().toISOString(),temp:true}; setMessages(prev=>{const u=[...(prev||[]),temp];AsyncStorage.setItem('chatMessages',JSON.stringify(u));return u;}); setChatInput(''); setTotalMessages(p=>{const n=p+1;AsyncStorage.setItem('totalMessages',n.toString());return n;}); if(isOnline) socketRef.current.emit('send-message',{code:pairCode,user:userRole,text,nickname:myNickname||userRole}); else { const off=await AsyncStorage.getItem('offlineMessages'),pend=off?JSON.parse(off):[]; pend.push({code:pairCode,user:userRole,text,nickname:myNickname||userRole}); await AsyncStorage.setItem('offlineMessages',JSON.stringify(pend)); } if(!IS_WEB) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }, [chatInput, socketRef, partnerSleeping, pairCode, userRole, myNickname, isOnline]);
  const addReaction = useCallback((messageId, reaction) => { setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reaction } : m)); setShowReactions(null); if (!IS_WEB) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }, []);
  const handleChatInput = useCallback((text) => { setChatInput(text); if(partnerSleeping) return; if(text.length>0&&!isTyping){setIsTyping(true);socketRef.current?.emit('typing-start',{pairCode,user:userRole,nickname:myNickname||userRole});} else if(text.length===0&&isTyping){setIsTyping(false);socketRef.current?.emit('typing-stop',{pairCode,user:userRole});} }, [partnerSleeping, isTyping, pairCode, userRole, myNickname]);
  const completeRitual = useCallback(() => { if(!ritualText.trim()||!socketRef.current) return; socketRef.current.emit('complete-ritual',{code:pairCode,user:userRole,text:ritualText}); const newHistory = [...ritualHistory, { date: new Date().toISOString(), text: ritualText, user: userRole }]; setRitualHistory(newHistory); AsyncStorage.setItem('ritualHistory', JSON.stringify(newHistory)); setRitualText(''); Alert.alert('✨ Готово!'); if (!IS_WEB) triggerConfetti(); }, [ritualText, socketRef, pairCode, userRole, ritualHistory]);
  const sendPeace = useCallback(() => { if(!socketRef.current)return; socketRef.current.emit('peace-request',{code:pairCode,user:userRole}); setPeaceActive(true); Alert.alert('🤝 Отправлено'); }, [socketRef, pairCode, userRole]);
  const updateStatus = useCallback((mood) => { if(!socketRef.current)return; socketRef.current.emit('update-status',{code:pairCode,user:userRole,value:mood}); if(userRole==='M')setStatusA(mood);else setStatusB(mood); }, [socketRef, pairCode, userRole]);
  const toggleSleep = useCallback(() => { if(!socketRef.current)return; socketRef.current.emit('sleep-toggle',{pairCode,user:userRole,active:true}); Alert.alert('🌙 Режим сна'); }, [socketRef, pairCode, userRole]);
  const logout = useCallback(async () => { if(socketRef.current)socketRef.current.disconnect(); setPairCode('');setUserRole(null);setCurrentScreen('welcome');setPeaceActive(false); await secureDel('pairData'); }, []);
  const toggleSecurity = useCallback(async () => { const v=!securityEnabled; setSecurityEnabled(v); await secureSet('securityEnabled',v.toString()); if(!v){setBiometricEnabled(false);setPinCode('');await secureDel('biometricEnabled');await secureDel('pinCode');} }, [securityEnabled]);
  const toggleBiometric = useCallback(async () => { if(!IS_WEB){const h=await LocalAuthentication.hasHardwareAsync();if(!h)return Alert.alert('Нет биометрии');const v=!biometricEnabled;setBiometricEnabled(v);await secureSet('biometricEnabled',v.toString());} }, [biometricEnabled]);
  const toggleSound = useCallback(async () => { const v=!soundEnabled;setSoundEnabled(v);await AsyncStorage.setItem('soundEnabled',v.toString()); }, [soundEnabled]);
  const toggleHideNotifications = useCallback(async () => { const v=!hideNotificationContent;setHideNotificationContent(v);await AsyncStorage.setItem('hideNotificationContent',v.toString()); }, [hideNotificationContent]);
  const changePinCode = useCallback(() => { Alert.prompt('Новый PIN','4 цифры',[{text:'Отмена'},{text:'ОК',onPress:async(p)=>{if(p&&p.length===4&&/^\d+$/.test(p)){setPinCode(p);await secureSet('pinCode',p);Alert.alert('OK');}else Alert.alert('Ошибка');}}],'secure-text'); }, []);
  const addImportantDate = useCallback(async () => { if(!dateTitle.trim())return Alert.alert('Ошибка','Введите название'); const nd={id:Date.now().toString(),title:dateTitle,date:selectedDate.toISOString()}; const upd=[...importantDates,nd]; setImportantDates(upd); await AsyncStorage.setItem('importantDates',JSON.stringify(upd)); setShowAddDateModal(false);setDateTitle('');Alert.alert('📅 Добавлено'); }, [dateTitle, selectedDate, importantDates]);
  const deleteImportantDate = useCallback(async (id) => { const upd=importantDates.filter(d=>d.id!==id); setImportantDates(upd); await AsyncStorage.setItem('importantDates',JSON.stringify(upd)); }, [importantDates]);
  const checkPin = useCallback(async () => { if(pinCode&&pinInput===pinCode){setShowPinScreen(false);setPinInput('');return true;}else if(pinInput.length===4){Alert.alert('Неверный PIN');setPinInput('');}return false; }, [pinCode, pinInput]);
  const getPulseColor = useCallback((s) => s<30?colors.textMuted:s<70?colors.primary:colors.warning, [colors]);
  const getStatusLabel = useCallback((s) => MOOD_EMOJIS.find(m=>m.emoji===s)?.key||s, []);
  const sendHapticLove = useCallback(() => { if(!socketRef.current) return Alert.alert('Ошибка', 'Нет соединения'); if(!IS_WEB) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); socketRef.current.emit('haptic-pulse', { pairCode, user: userRole }); Animated.sequence([Animated.spring(hapticScale, { toValue: 1.3, useNativeDriver: true }), Animated.spring(hapticScale, { toValue: 1, useNativeDriver: true })]).start(); }, [socketRef, pairCode, userRole, hapticScale]);
  const submitQuiz = useCallback(() => { if(!quizInput.trim()||quizState.answered) return; socketRef.current.emit('quiz-submit', { code: pairCode, user: userRole, ans: quizInput }); const today = new Date().toDateString(); const newQuiz = { ...quizState, answered: true, myAns: quizInput, date: today }; setQuizState(newQuiz); AsyncStorage.setItem('dailyQuiz', JSON.stringify(newQuiz)); setQuizStreak(prev => { const newStreak = prev + 1; AsyncStorage.setItem('quizStreak', newStreak.toString()); return newStreak; }); setQuizInput(''); Alert.alert('Ответ сохранён! Ждём партнёра... 🤫'); }, [quizInput, quizState, socketRef, pairCode, userRole]);
  const unlockTheme = useCallback((themeKey) => { if (themeKey !== 'secret') return; if (unlockedAchievements.includes('secret_theme')) { setThemeMode('secret'); AsyncStorage.setItem('themeMode', 'secret'); Alert.alert(t('themeUnlocked')); setShowThemeModal(false); } }, [unlockedAchievements, t]);

  if(showPinScreen) return (<SafeAreaView style={[styles.safeArea,{backgroundColor:colors.bg}]}><View style={styles.pinContainer}><Text style={styles.pinIcon}>🔐</Text><Text style={[styles.pinTitle,{color:colors.text}]}>{t('protection')}</Text><View style={styles.pinInputContainer}>{[0,1,2,3].map(i => <View key={i} style={[styles.pinDot,{backgroundColor:pinInput.length>i?colors.primary:colors.bgCard}]}/>)}</View><TextInput style={styles.pinInputHidden} value={pinInput} onChangeText={setPinInput} keyboardType="number-pad" maxLength={4} autoFocus onSubmitEditing={()=>checkPin()}/><TouchableOpacity onPress={()=>setShowPinScreen(false)} style={{marginTop:30}}><Text style={[styles.pinCancel,{color:colors.textSecondary}]}>{t('cancel')}</Text></TouchableOpacity></View></SafeAreaView>);
  if(!isInitialized) return (<View style={[styles.loading,{backgroundColor:colors.bg}]}><ActivityIndicator size="large" color={colors.primary}/><Text style={[styles.loadingText,{color:colors.text}]}>Загрузка...</Text></View>);
  if(hasError) return (<View style={[styles.errorContainer,{backgroundColor:colors.bg}]}><Text style={styles.errorIcon}>😕</Text><Text style={[styles.errorTitle,{color:colors.text}]}>{t('welcome')}</Text><GradientButton onPress={()=>setHasError(false)} title="Перезапустить" colors={[colors.primary, '#ff6b9d']} /></View>);
  if(!hasSeenOnboarding) return (<SafeAreaView style={[styles.safeArea,{backgroundColor:colors.bg}]}><View style={styles.onboardingContainer}><Animated.View style={{opacity:fadeIn,transform:[{scale:fadeIn}]}}><Text style={styles.onboardingIcon}>{onboardingStep===0?'💕':onboardingStep===1?'💬':''}</Text><Text style={[styles.onboardingTitle,{color:colors.text}]}>{onboardingStep===0?t('welcome'):onboardingStep===1?t('chat'):'Безопасность'}</Text><Text style={[styles.onboardingDesc,{color:colors.textSecondary}]}>{onboardingStep===0?'Feel In — личное пространство только для вас двоих.':onboardingStep===1?'Обменивайтесь сообщениями, настроением и ритуалами в реальном времени.':'Защитите приложение PIN-кодом или Face ID. Ваши данные принадлежат только вам.'}</Text><View style={styles.dots}>{[0,1,2].map(i=><View key={i} style={[styles.dot,i===onboardingStep?{backgroundColor:colors.primary,width:24}:{}]}/>)}</View><GradientButton onPress={()=>{if(onboardingStep<2)setOnboardingStep(p=>p+1);else{setHasSeenOnboarding(true);AsyncStorage.setItem('hasSeenOnboarding','true');}}} title={onboardingStep<2?'Далее':'Начать'} colors={[colors.primary,'#ff6b9d']} style={{marginTop:20}} />{onboardingStep>0&&<TouchableOpacity onPress={()=>setOnboardingStep(p=>p-1)} style={{marginTop:12}}><Text style={{color:colors.textSecondary}}>Назад</Text></TouchableOpacity>}</Animated.View></View></SafeAreaView>);

  const nextDate = importantDates.length > 0 ? importantDates.reduce((a, b) => new Date(a.date) < new Date(b.date) ? a : b) : null;
  const countdown = nextDate ? Math.ceil((new Date(nextDate.date) - new Date()) / (1000 * 60 * 60 * 24)) : null;
  const moodRecommendations = statusA ? MOOD_RECOMMENDATIONS[MOOD_EMOJIS.find(m => m.emoji === statusA)?.key] || [] : [];
  const pulseDiff = digestData.pulse - digestData.prevPulse; const messagesDiff = digestData.messages - digestData.prevMessages;

  return (
    <SafeAreaView style={[styles.safeArea,{backgroundColor:colors.bg}]}>
      <StatusBar barStyle={themeMode==='light'?'dark-content':'light-content'} backgroundColor={colors.bg} />
      <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={[styles.container,{backgroundColor:colors.bg}]}>
        {currentScreen==='welcome'&&(
          <Animated.View style={[styles.center,{opacity:fadeIn}]}>
            <Text style={styles.logo}>💕</Text>
            <Text style={[styles.title,{color:colors.text}]}>Feel In</Text>
            <Text style={[styles.subtitle,{color:colors.textSecondary}]}>Ваше личное пространство</Text>
            <View style={styles.btns}>
              <GradientButton onPress={async()=>{setLoading(true);try{const r=await fetch(`${CONFIG.SERVER_URL}/api/pair/create`,{method:'POST',headers:{'Content-Type':'application/json'}});if(!r.ok)throw new Error();const d=await r.json();setPairCode(d.code);setUserRole('M');setCurrentScreen('main');await secureSet('pairData',JSON.stringify({pairCode:d.code,userRole:'M',timestamp:Date.now()}));if(!await AsyncStorage.getItem('relationshipStart'))await AsyncStorage.setItem('relationshipStart',new Date().toISOString());connectSocket(d.code);}catch(e){console.error(e);Alert.alert('Ошибка','Не удалось создать пару. Проверьте интернет-соединение.');}finally{setLoading(false);}}} title={loading?'...':t('createPair')} colors={[colors.primary,'#ff6b9d']} disabled={loading}/>
              <TouchableOpacity onPress={()=>setCurrentScreen('join')} style={[styles.btnSecondary,{backgroundColor:colors.bgCard,borderColor:colors.border}]}><Text style={[styles.btnSecondaryText,{color:colors.text}]}>{t('join')}</Text></TouchableOpacity>
            </View>
          </Animated.View>
        )}
        {currentScreen==='join'&&(
          <View style={[styles.container,{backgroundColor:colors.bg}]}>
            <TouchableOpacity style={styles.back} onPress={()=>setCurrentScreen('welcome')}><Text style={[styles.backText,{color:colors.textSecondary}]}>{t('back')}</Text></TouchableOpacity>
            <View style={styles.center}>
              <Text style={[styles.sectionTitle,{color:colors.text, textAlign: 'center'}]}>{t('codeLabel')}</Text>
              <TextInput style={[styles.input,{backgroundColor:colors.bgCard,color:colors.text,borderColor:colors.border, textAlign: 'center'}]} placeholder="FEEL-XXXX" placeholderTextColor={colors.textMuted} value={pairCode} onChangeText={setPairCode} autoCapitalize="characters" maxLength={12}/>
              <GradientButton onPress={async()=>{
                let cleanCode = pairCode.trim().toUpperCase();
                if (!cleanCode.startsWith('FEEL-')) {
                  cleanCode = 'FEEL-' + cleanCode.replace('FEEL-', '');
                }
                if(!cleanCode || cleanCode === 'FEEL-') return Alert.alert('Ошибка','Введите код пары');
                setLoading(true);
                try {
                  const r = await fetch(`${CONFIG.SERVER_URL}/api/pair/join`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({code: cleanCode})
                  });
                  if(!r.ok) {
                    const errData = await r.json().catch(() => ({}));
                    throw new Error(errData.error || 'Server Error');
                  }
                  const d = await r.json();
                  setPairCode(d.pair.code);
                  setUserRole('Ж');
                  setCurrentScreen('main');
                  await secureSet('pairData', JSON.stringify({pairCode: d.pair.code, userRole: 'Ж', timestamp: Date.now()}));
                  connectSocket(d.pair.code);
                } catch(e) {
                  console.error(e);
                  if (typeof window !== 'undefined') window.alert('Ошибка входа: ' + e.message);
                  else Alert.alert('Ошибка', 'Не удалось войти. ' + e.message);
                } finally {
                  setLoading(false);
                }
              }} title={loading?'...':t('join')} colors={[colors.secondary,'#48cae4']} disabled={loading}/>
            </View>
          </View>
        )}
        {currentScreen==='main'&&(
          <View style={[styles.container,{backgroundColor:colors.bg}]}>
            <LinearGradient colors={themeMode==='light'?['#f8f9fa','#ffffff']:['#1a1a35','#2d2d55']} style={styles.header}>
              <View>
                <Text style={[styles.headerTitle,{color:colors.text}]}>Feel In</Text>
                <Text style={[styles.headerCode,{color:colors.textMuted}]}>{pairCode} {!isOnline&&<Text style={{color:colors.warning}}> ●</Text>}</Text>
              </View>
              <View style={{flexDirection:'row',gap:12}}>
                <TouchableOpacity onPress={()=>setShowSettings(true)}><Text style={{fontSize:24}}>⚙️</Text></TouchableOpacity>
                <TouchableOpacity onPress={()=>setShowProfileModal(true)}><View style={[styles.avatarBadge,{backgroundColor:myAvatarColor}]}><Text style={styles.avatarText}>{(myNickname||'Я').charAt(0).toUpperCase()}</Text></View></TouchableOpacity>
                <TouchableOpacity onPress={logout}><Text style={{fontSize:22}}>🚪</Text></TouchableOpacity>
              </View>
            </LinearGradient>
            <ScrollView style={styles.scroll} contentContainerStyle={{padding:16}} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary}/>}>
              <View style={[styles.pulseContainer,{backgroundColor:colors.bgCard,borderColor:colors.border}]}>
                {nextDate && countdown >= 0 && (<View style={{marginBottom:12,padding:8,backgroundColor:colors.primary+'20',borderRadius:12,width:'100%'}}><Text style={{color:colors.primary,fontSize:12,fontWeight:'600',textAlign:'center'}}>{t('nextDate')}: {nextDate.title}</Text><Text style={{color:colors.text,fontSize:16,fontWeight:'800',textAlign:'center'}}>{countdown} {t('daysLeft')} {t('countdown')}</Text></View>)}
                <Animated.View style={{transform:[{scale:pulseAnim}]}}><LinearGradient colors={[getPulseColor(pulseScore),colors.primary]} style={styles.pulseHeartGradient}><Text style={styles.pulseHeart}>💓</Text></LinearGradient></Animated.View>
                <Text style={[styles.pulseText,{color:colors.text}]}>{t('mood').split(' ')[0]}: <Text style={{color:getPulseColor(pulseScore),fontWeight:'800'}}>{pulseScore}%</Text></Text>
                {pulseScore >= 100 && <Text style={{color:colors.warning,fontSize:12,marginTop:4}}>🎉 Идеальная синхронизация!</Text>}
              </View>
              <LinearGradient colors={themeMode==='light'?['#f8f9fa','#ffffff']:['#1a1a35','#2d2d55']} style={styles.statCard}>
                <View style={styles.statRow}>
                  <View style={styles.statItem}><Text style={[styles.statVal,{color:colors.accent}]}>{daysTogether}</Text><Text style={[styles.statLabel,{color:colors.textSecondary}]}>{t('days')}</Text></View>
                  <View style={[styles.divider,{backgroundColor:colors.border}]}/><View style={styles.statItem}><Text style={[styles.statVal,{color:colors.warning}]}>🔥{streak}</Text><Text style={[styles.statLabel,{color:colors.textSecondary}]}>{t('ritual')}</Text></View>
                  <View style={[styles.divider,{backgroundColor:colors.border}]}/><View style={styles.statItem}><Text style={[styles.statVal,{color:colors.secondary}]}>💬{totalMessages}</Text><Text style={[styles.statLabel,{color:colors.textSecondary}]}>{t('messages')}</Text></View>
                </View>
              </LinearGradient>
              <Card style={{borderColor: colors.accent, borderWidth: 1, backgroundColor: colors.bgCard}}>
                <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:12}}><Text style={[styles.cardTitle,{color:colors.text}]}>{t('quiz')}</Text>{quizStreak > 0 && <Text style={{color:colors.warning,fontSize:12,fontWeight:'700'}}>🔥 {quizStreak} {t('streak')}</Text>}</View>
                <Text style={{color: colors.textSecondary, marginBottom: 10, fontSize: 14}}>{quizState.question || DAILY_QUESTIONS[new Date().getDate() % DAILY_QUESTIONS.length]}</Text>
                {!quizState.answered ? (<View><TextInput style={[styles.modalInput,{backgroundColor:colors.bg,color:colors.text,borderColor:colors.border}]} placeholder={t('answer')} value={quizInput} onChangeText={setQuizInput} multiline /><GradientButton onPress={submitQuiz} title={t('answer')} colors={[colors.accent, '#9c5cff']} /></View>) : (<View style={{backgroundColor: colors.bg, padding: 12, borderRadius: 12}}><Text style={{color: colors.textSecondary, fontSize: 12}}>{t('answer')}: {quizState.myAns}</Text>{quizState.revealed ? (<><Text style={{color: colors.success, marginTop: 6}}>{t('revealed')}: {quizState.partnerAns}</Text><Text style={{color:colors.primary,marginTop:8,fontSize:12,fontWeight:'600'}}>{t('matchStats')}: {matchStats.matches}/{matchStats.total} совпадений</Text></>) : (<Text style={{color: colors.warning, marginTop: 6}}>{t('waitPartner')}</Text>)}</View>)}</Card>
              <Card style={{backgroundColor:colors.bgCard,borderColor:colors.border}}>
                <Text style={[styles.cardTitle,{color:colors.text}]}>{t('mood')}</Text>
                <View style={styles.statusRow}>
                  <View style={[styles.statusBadge,{backgroundColor:colors.bg,borderLeftColor:myAvatarColor,borderLeftWidth:4,borderColor:colors.border}]}><Text style={[styles.statusText,{color:myAvatarColor}]}>{myNickname||'Я'}</Text><Text style={styles.statusEmoji}>{statusA||'—'}</Text></View>
                  <View style={styles.statusDivider}><Text style={[styles.dividerDot,{color:colors.textMuted}]}>•</Text></View>
                  <View style={[styles.statusBadge,{backgroundColor:colors.bg,borderLeftColor:partnerAvatarColor,borderLeftWidth:4,borderColor:colors.border}]}><Text style={[styles.statusText,{color:partnerAvatarColor}]}>{partnerNickname}</Text><Text style={styles.statusEmoji}>{statusB||'—'}</Text></View>
                </View>
                {moodRecommendations.length > 0 && (<View style={{marginTop:12,padding:12,backgroundColor:colors.success+'20',borderRadius:12}}><Text style={{color:colors.success,fontSize:12,fontWeight:'600',marginBottom:4}}>💡 {t('recommendations')}:</Text>{moodRecommendations.map((rec,i) => <Text key={i} style={{color:colors.textSecondary,fontSize:12,marginTop:2}}>• {rec}</Text>)}</View>)}
                <View style={styles.moodGrid}>{MOOD_EMOJIS.map(item=><TouchableOpacity key={item.key} style={[styles.moodBtn,{backgroundColor:colors.bg,borderColor:colors.border},(statusA===item.emoji||statusB===item.emoji)?{backgroundColor:colors.primary+'40',borderColor:colors.primary}:{}]} onPress={()=>updateStatus(item.emoji)}><Text style={styles.moodEmoji}>{item.emoji}</Text></TouchableOpacity>)}</View>
              </Card>
              <Card style={{backgroundColor:colors.bgCard,borderColor:colors.border}}>
                <Text style={[styles.cardTitle,{color:colors.text}]}>{t('chat')} {uploadingMedia&&' ⏳'}</Text>
                {partnerSleeping?(<View style={[styles.sleepBlock,{backgroundColor:colors.bg}]}><Text style={{fontSize:48}}>🌙</Text><Text style={[styles.sleepBlockTitle,{color:colors.accent}]}>{t('sleep')}</Text></View>):(<View style={[styles.chatBox,{backgroundColor:colors.bg,borderColor:colors.border}]}>
                  <FlatList ref={chatListRef} data={messages||[]} initialNumToRender={15} maxToRenderPerBatch={5} windowSize={10} removeClippedSubviews={true} keyExtractor={item=>item?.id||String(Math.random())} renderItem={({item})=>{if(!item)return null;return (<TouchableOpacity onLongPress={() => setShowReactions(item.id)} activeOpacity={0.9}><MessageBubble item={item} userRole={userRole} colors={colors} /></TouchableOpacity>);}} ListEmptyComponent={<View style={styles.chatEmptyContainer}><Text style={styles.chatEmptyIcon}>💬</Text><Text style={[styles.chatEmpty,{color:colors.textMuted}]}>{t('noMessages')}</Text></View>}/>
                  {partnerTyping&&<Text style={[styles.typingText,{color:colors.textMuted}]}>✍️ {partnerTyping} {t('typing')}</Text>}
                </View>)}
                {!partnerSleeping&&<View style={styles.chatInputRow}>
                  <TouchableOpacity onPress={()=>pickAndSendMedia('image')} style={[styles.attachBtn,{backgroundColor:colors.bgCard}]}><Text style={styles.attachText}>{t('attach')}</Text></TouchableOpacity>
                  <TextInput style={[styles.chatInput,{backgroundColor:colors.bg,color:colors.text,borderColor:colors.border}]} placeholder={t('chat')} placeholderTextColor={colors.textMuted} value={chatInput} onChangeText={handleChatInput} onSubmitEditing={sendMessage}/>
                  <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}><LinearGradient colors={[colors.primary,'#ff6b9d']} style={styles.sendBtnGradient}><Text style={styles.sendText}>{t('send')}</Text></LinearGradient></TouchableOpacity>
                </View>}
              </Card>
              <Card style={{backgroundColor:colors.bgCard,borderColor:colors.border}}>
                <View style={styles.cardHeader}><Text style={[styles.cardTitle,{color:colors.text}]}>{t('dates')}</Text><View style={{flexDirection:'row', gap:12, alignItems:'center'}}><TouchableOpacity onPress={fetchCalendarEvents} style={[styles.importBtn, {opacity: calendarLoading ? 0.5 : 1}]} disabled={calendarLoading}><Text style={styles.importBtnText}>{calendarLoading ? '⏳' : t('importCalendar')}</Text></TouchableOpacity><TouchableOpacity onPress={()=>setShowAddDateModal(true)}><Text style={[styles.addText,{color:colors.secondary}]}>{t('addDate')}</Text></TouchableOpacity></View></View>
                {importantDates.length===0?<Text style={[styles.emptyText,{color:colors.textMuted}]}>{t('noDates')}</Text>:importantDates.map(date=>{const ed=new Date(date.date),dl=Math.ceil((ed-new Date())/(1000*60*60*24));return(<View key={date.id} style={[styles.dateItem,{backgroundColor:colors.bg}]}><View style={styles.dateInfo}><Text style={[styles.dateTitle,{color:colors.text}]}>{date.title}</Text><Text style={[styles.dateValue,{color:colors.textSecondary}]}>{ed.toLocaleDateString()} • {dl>0?`${dl} ${t('daysLeft')}`:t('today')}</Text></View><TouchableOpacity onPress={()=>deleteImportantDate(date.id)}><Text style={styles.deleteIcon}>🗑️</Text></TouchableOpacity></View>);})}
              </Card>
              <Card style={{backgroundColor:colors.bgCard,borderColor:colors.border}}>
                <Text style={[styles.cardTitle,{color:colors.text}]}>{t('achievements')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{maxHeight: 100}}>
                  <View style={styles.achievementsGridCompact}>
                    {ACHIEVEMENTS.map(ach=>{const u=unlockedAchievements.includes(ach.id);return(<View key={ach.id} style={[styles.achievementItemCompact,{backgroundColor:colors.bg,borderColor:colors.border},u&&{backgroundColor:colors.bgCard,borderColor:colors.warning}]}><Text style={styles.achievementIconSmall}>{u?ach.icon:'🔒'}</Text>{u && <Text style={[styles.achievementTitleSmall,{color:colors.text}]}>{t(ach.title).split('_')[0]}</Text>}</View>);})}
                  </View>
                </ScrollView>
                {unlockedAchievements.length < ACHIEVEMENTS.length && (<Text style={{color:colors.textMuted, fontSize:11, marginTop:8, textAlign:'center'}}>{ACHIEVEMENTS.length - unlockedAchievements.length} ещё не открыто</Text>)}
              </Card>
              <Card style={{backgroundColor:colors.bgCard,borderColor:colors.border}}>
                <Text style={[styles.cardTitle,{color:colors.text}]}>{t('ritualCard')}</Text>
                <TextInput style={[styles.textArea,{backgroundColor:colors.bg,color:colors.text,borderColor:colors.border}]} placeholder={t('gratitude')} placeholderTextColor={colors.textMuted} value={ritualText} onChangeText={setRitualText} multiline numberOfLines={3}/>
                <GradientButton onPress={completeRitual} title="✨ Завершить" colors={[colors.success,'#06d6a0']}/>
                {ritualHistory.length > 0 && (<View style={{marginTop:16}}><Text style={{color:colors.textSecondary,fontSize:12,fontWeight:'600',marginBottom:8}}>📜 {t('progress')}:</Text>{ritualHistory.slice(-3).reverse().map((r,i) => (<View key={i} style={{padding:8,backgroundColor:colors.bg,borderRadius:8,marginBottom:4}}><Text style={{color:colors.textSecondary,fontSize:11}}>{new Date(r.date).toLocaleDateString()} - {r.text.substring(0,50)}{r.text.length > 50 ? '...' : ''}</Text></View>))}</View>)}
              </Card>
              <TouchableOpacity onPress={sendPeace} style={[styles.actionButton,{borderColor:colors.border}]}><LinearGradient colors={[colors.success,'#06d6a0']} style={styles.actionButtonGradient}><Text style={{fontSize:32,marginBottom:8}}>🕊️</Text><Text style={{color:'#fff',fontWeight:'700'}}>{t('peace')}</Text></LinearGradient></TouchableOpacity>
              <TouchableOpacity onPress={toggleSleep} style={[styles.actionButton,{marginTop:12,borderColor:colors.border}]}><LinearGradient colors={themeMode==='light'?['#e5e7eb','#f3f4f6']:['#1a1a35','#2d2d55']} style={styles.actionButtonGradient}><Text style={{fontSize:32,marginBottom:8}}>🌙</Text><Text style={{color:themeMode==='light'?colors.textSecondary:colors.accent,fontWeight:'700'}}>{t('sleep')}</Text></LinearGradient></TouchableOpacity>
              <View style={{height:40}}/>
            </ScrollView>
          </View>
        )}
        {currentScreen === 'main' && showHapticWidget && (<Animated.View style={[styles.floatingWidget, { transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale: hapticScale }] }]} {...panResponder.panHandlers}><TouchableOpacity style={[styles.floatingBtn,{backgroundColor:colors.primary}]} onPress={sendHapticLove} activeOpacity={0.8} onLongPress={() => {if(!IS_WEB) Haptics.selectionAsync(); setShowHapticWidget(false);}}><Text style={{fontSize: 28}}>💓</Text></TouchableOpacity><TouchableOpacity style={styles.closeWidget} onPress={() => setShowHapticWidget(false)}><Text style={{color: '#fff', fontSize: 12}}>✕</Text></TouchableOpacity></Animated.View>)}
        {showReactions && (<Modal visible={true} transparent animationType="fade"><TouchableOpacity style={styles.modalOverlay} onPress={() => setShowReactions(null)}><View style={styles.reactionsPicker}>{['❤️','😂','','','',''].map(emoji => (<TouchableOpacity key={emoji} style={styles.reactionBtn} onPress={() => addReaction(showReactions, emoji)}><Text style={{fontSize:24}}>{emoji}</Text></TouchableOpacity>))}</View></TouchableOpacity></Modal>)}
        <Modal visible={showCalendarImport} transparent animationType="slide"><View style={styles.modalOverlay}><View style={[styles.modalContent,{backgroundColor:colors.bgCard,borderColor:colors.border}]}>
          <Text style={[styles.modalTitle,{color:colors.text}]}>{t('importTitle')}</Text>
          <FlatList data={calendarEvents} keyExtractor={item => item.id} renderItem={({item}) => (<TouchableOpacity style={styles.calendarItem} onPress={() => importEvent(item)}><View style={{flex:1}}><Text style={[styles.calendarItemTitle,{color: colors.text}]} numberOfLines={2}>{item.title}</Text><Text style={{color: colors.textSecondary, fontSize: 12, marginTop: 4}}>{new Date(item.date).toLocaleDateString()} {item.isAllDay ? `(${t('today')})` : ''}</Text></View><Text style={{color: colors.success, fontSize: 22, fontWeight:'700'}}>+</Text></TouchableOpacity>)} ListEmptyComponent={<Text style={{color: colors.textMuted, textAlign: 'center', padding: 20}}>{t('noEvents')}</Text>} style={{maxHeight: 300, width: '100%'}}/>
          <TouchableOpacity onPress={() => setShowCalendarImport(false)} style={{marginTop: 16, padding: 12}}><Text style={[{color: colors.textSecondary, textAlign: 'center', fontWeight:'600'}]}>{t('close')}</Text></TouchableOpacity>
        </View></View></Modal>
        <Modal visible={showDigest} transparent animationType="slide"><View style={styles.modalOverlay}><View style={[styles.modalContent,{backgroundColor:colors.bgCard,borderColor:colors.border}]}>
          <Text style={[styles.modalTitle,{color:colors.text}]}>{t('digestTitle')}</Text>
          <View style={{marginVertical:12}}>
            <Text style={{color:colors.textSecondary}}>{t('messagesSent')}: <Text style={{color:colors.text,fontWeight:'700'}}>{digestData.messages}</Text>{messagesDiff > 0 && <Text style={{color:colors.success,fontSize:12}}> +{messagesDiff}</Text>}</Text>
            <Text style={{color:colors.textSecondary,marginTop:6}}>{t('avgPulse')}: <Text style={{color:colors.primary,fontWeight:'700'}}>{digestData.pulse}%</Text>{pulseDiff > 0 && <Text style={{color:colors.success,fontSize:12}}> +{pulseDiff}%</Text>}</Text>
            <Text style={{color:colors.textSecondary,marginTop:6}}>{t('streakDays')}: <Text style={{color:colors.warning,fontWeight:'700'}}>{digestData.streak}</Text></Text>
            {digestData.dates.length>0 && (<>
              <Text style={{color:colors.textSecondary,marginTop:12}}>{t('datesUpcoming')}:</Text>
              {digestData.dates.map((d,i)=><Text key={i} style={{color:colors.text,marginTop:4}}>• {d.title} ({new Date(d.date).toLocaleDateString()})</Text>)}
            </>)}
            <View style={{marginTop:16,padding:12,backgroundColor:colors.bg,borderRadius:12}}><Text style={{color:colors.accent,fontSize:12,fontWeight:'600',marginBottom:4}}>💡 {t('recommendations')}:</Text>{["Попробуйте новый ритуал вместе", "Посетите место первой встречи"].map((r,i) => <Text key={i} style={{color:colors.textSecondary,fontSize:12,marginTop:2}}>• {r}</Text>)}</View>
          </View>
          <GradientButton onPress={()=>setShowDigest(false)} title="OK" colors={[colors.primary,'#ff6b9d']}/>
        </View></View></Modal>
        <Modal visible={showThemeModal} transparent animationType="slide"><View style={styles.modalOverlay}><View style={[styles.modalContent,{backgroundColor:colors.bgCard,borderColor:colors.border}]}>
          <Text style={[styles.modalTitle,{color:colors.text}]}>{t('theme')}</Text>
          <View style={{flexDirection:'row',flexWrap:'wrap',gap:12,justifyContent:'center'}}>
            {Object.keys(themes).map(key => { const theme = themes[key]; const isUnlocked = key !== 'secret' || unlockedAchievements.includes('secret_theme'); const isSelected = themeMode === key; return (<TouchableOpacity key={key} disabled={!isUnlocked} onPress={() => { setThemeMode(key); AsyncStorage.setItem('themeMode', key); setShowThemeModal(false); }} style={[styles.themeOption,{backgroundColor:theme.bg,borderColor:isSelected?theme.primary:theme.border,opacity:isUnlocked?1:0.4}]}>
              <Text style={{color:theme.text,fontSize:12,fontWeight:isSelected?'700':'400'}}>{theme.name}</Text>{!isUnlocked && <Text style={{fontSize:10,color:theme.textMuted}}>🔒</Text>}
            </TouchableOpacity>); })}
          </View>
          <TouchableOpacity onPress={() => setShowThemeModal(false)} style={{marginTop: 16, padding: 12}}><Text style={[{color: colors.textSecondary, textAlign: 'center', fontWeight:'600'}]}>{t('close')}</Text></TouchableOpacity>
        </View></View></Modal>
        
        <Modal visible={showSettings} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.settingsContent,{backgroundColor:colors.bgCard,borderColor:colors.border}]}>
              <View style={styles.settingsHeader}>
                <Text style={[styles.settingsTitle,{color:colors.text}]}>⚙️ {t('settings')}</Text>
                <TouchableOpacity onPress={()=>setShowSettings(false)}><Text style={{fontSize:28,color:colors.textSecondary}}>✕</Text></TouchableOpacity>
              </View>
              <ScrollView style={{flex:1}} showsVerticalScrollIndicator={false}>
                <View style={styles.settingSection}>
                  <Text style={[styles.settingSectionTitle,{color:colors.primary}]}>📊 {t('privacy')}</Text>
                  <TouchableOpacity style={styles.settingButtonModern} onPress={generateDigest}>
                    <Text style={{fontSize:24,marginRight:12}}>📊</Text>
                    <View style={{flex:1}}><Text style={[styles.settingButtonText,{color:colors.text}]}>{t('digest')}</Text><Text style={{fontSize:12,color:colors.textSecondary}}>Посмотреть статистику за неделю</Text></View>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.settingButtonModern} onPress={exportData}>
                    <Text style={{fontSize:24,marginRight:12}}>📥</Text>
                    <View style={{flex:1}}><Text style={[styles.settingButtonText,{color:colors.text}]}>{t('export')}</Text><Text style={{fontSize:12,color:colors.textSecondary}}>{t('exportDesc')}</Text></View>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.settingButtonModern,{borderColor:colors.warning}]} onPress={deleteAccount}>
                    <Text style={{fontSize:24,marginRight:12}}>🗑</Text>
                    <View style={{flex:1}}><Text style={[styles.settingButtonText,{color:colors.warning}]}>{t('delete')}</Text><Text style={{fontSize:12,color:colors.textSecondary}}>{t('deleteDesc')}</Text></View>
                  </TouchableOpacity>
                </View>
                <View style={styles.settingSection}>
                  <Text style={[styles.settingSectionTitle,{color:colors.primary}]}>🎨 {t('theme')} & {t('language')}</Text>
                  <TouchableOpacity style={styles.settingButtonModern} onPress={() => setShowThemeModal(true)}>
                    <Text style={{fontSize:24,marginRight:12}}>🎨</Text>
                    <View style={{flex:1}}><Text style={[styles.settingButtonText,{color:colors.text}]}>Выбрать тему</Text><Text style={{fontSize:12,color:colors.textSecondary}}>Текущая: {themes[themeMode].name}</Text></View>
                    <Text style={{fontSize:16,color:colors.textSecondary}}>›</Text>
                  </TouchableOpacity>
                  <View style={{flexDirection:'row',gap:12,marginTop:12}}>
                    <TouchableOpacity onPress={()=>{setLang('ru');AsyncStorage.setItem('appLang','ru')}} style={[styles.langBtn,{backgroundColor:lang==='ru'?colors.primary:colors.bg,borderColor:colors.border}]}><Text style={{color:lang==='ru'?'#fff':colors.text,fontWeight:'600'}}>🇷 RU</Text></TouchableOpacity>
                    <TouchableOpacity onPress={()=>{setLang('en');AsyncStorage.setItem('appLang','en')}} style={[styles.langBtn,{backgroundColor:lang==='en'?colors.primary:colors.bg,borderColor:colors.border}]}><Text style={{color:lang==='en'?'#fff':colors.text,fontWeight:'600'}}>🇬 EN</Text></TouchableOpacity>
                  </View>
                </View>
                <View style={styles.settingSection}>
                  <Text style={[styles.settingSectionTitle,{color:colors.primary}]}>🔐 {t('security')}</Text>
                  <View style={styles.settingItemModern}>
                    <View style={{flexDirection:'row',alignItems:'center',flex:1}}>
                      <Text style={{fontSize:24,marginRight:12}}>🔒</Text>
                      <View><Text style={[styles.settingLabel,{color:colors.text}]}>{t('protection')}</Text><Text style={{fontSize:12,color:colors.textSecondary}}>Защитить приложение</Text></View>
                    </View>
                    <TouchableOpacity style={[styles.toggle,securityEnabled&&{backgroundColor:colors.success}]} onPress={toggleSecurity}><View style={[styles.toggleCircle,{backgroundColor:securityEnabled?'#fff':colors.textMuted},securityEnabled&&{marginLeft:20}]}/></TouchableOpacity>
                  </View>
                  {securityEnabled && !IS_WEB && (
                    <View style={styles.settingItemModern}>
                      <View style={{flexDirection:'row',alignItems:'center',flex:1}}>
                        <Text style={{fontSize:24,marginRight:12}}>👤</Text>
                        <View><Text style={[styles.settingLabel,{color:colors.text}]}>{t('faceId')}</Text><Text style={{fontSize:12,color:colors.textSecondary}}>Биометрия</Text></View>
                      </View>
                      <TouchableOpacity style={[styles.toggle,biometricEnabled&&{backgroundColor:colors.success}]} onPress={toggleBiometric}><View style={[styles.toggleCircle,{backgroundColor:biometricEnabled?'#fff':colors.textMuted},biometricEnabled&&{marginLeft:20}]}/></TouchableOpacity>
                    </View>
                  )}
                  {securityEnabled && (
                    <TouchableOpacity style={styles.settingButtonModern} onPress={changePinCode}>
                      <Text style={{fontSize:24,marginRight:12}}>🔑</Text>
                      <View style={{flex:1}}><Text style={[styles.settingButtonText,{color:colors.text}]}>{t('changePin')}</Text></View>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.settingSection}>
                  <Text style={[styles.settingSectionTitle,{color:colors.primary}]}>🔔 {t('notifications')}</Text>
                  <View style={styles.settingItemModern}>
                    <View style={{flexDirection:'row',alignItems:'center',flex:1}}>
                      <Text style={{fontSize:24,marginRight:12}}>🔊</Text>
                      <View><Text style={[styles.settingLabel,{color:colors.text}]}>{t('sounds')}</Text><Text style={{fontSize:12,color:colors.textSecondary}}>Звуковые уведомления</Text></View>
                    </View>
                    <TouchableOpacity style={[styles.toggle,soundEnabled&&{backgroundColor:colors.success}]} onPress={toggleSound}><View style={[styles.toggleCircle,{backgroundColor:soundEnabled?'#fff':colors.textMuted},soundEnabled&&{marginLeft:20}]}/></TouchableOpacity>
                  </View>
                  <View style={styles.settingItemModern}>
                    <View style={{flexDirection:'row',alignItems:'center',flex:1}}>
                      <Text style={{fontSize:24,marginRight:12}}>🙈</Text>
                      <View><Text style={[styles.settingLabel,{color:colors.text}]}>{t('hideText')}</Text><Text style={{fontSize:12,color:colors.textSecondary}}>Скрывать текст</Text></View>
                    </View>
                    <TouchableOpacity style={[styles.toggle,hideNotificationContent&&{backgroundColor:colors.success}]} onPress={toggleHideNotifications}><View style={[styles.toggleCircle,{backgroundColor:hideNotificationContent?'#fff':colors.textMuted},hideNotificationContent&&{marginLeft:20}]}/></TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
        
        <Modal visible={showAddDateModal} transparent animationType="slide"><View style={styles.modalOverlay}><View style={[styles.modalContent,{backgroundColor:colors.bgCard,borderColor:colors.border}]}>
          <Text style={[styles.modalTitle,{color:colors.text}]}>{t('dates')}</Text>
          <TextInput style={[styles.modalInput,{backgroundColor:colors.bg,color:colors.text,borderColor:colors.border}]} placeholder={t('dates')} value={dateTitle} onChangeText={setDateTitle}/>
          {!IS_WEB && (<View style={[styles.datePickerContainer,{backgroundColor:colors.bg}]}><DateTimePicker value={selectedDate} mode="date" display="default" onChange={(e,d)=>d&&setSelectedDate(d)} textColor={colors.text}/></View>)}
          {IS_WEB && (<Text style={{ color: colors.textSecondary, textAlign: 'center', marginVertical: 12 }}>📅 Выбор даты доступен только в мобильном приложении</Text>)}
          <GradientButton onPress={addImportantDate} title={t('save')} colors={[colors.primary,'#ff6b9d']}/>
          <TouchableOpacity onPress={()=>setShowAddDateModal(false)} style={{marginTop:12}}><Text style={[{color:colors.textSecondary,textAlign:'center'}]}>{t('cancel')}</Text></TouchableOpacity>
        </View></View></Modal>
        <Modal visible={showProfileModal} transparent animationType="slide"><View style={styles.modalOverlay}><View style={[styles.modalContent,{backgroundColor:colors.bgCard,borderColor:colors.border}]}>
          <Text style={[styles.modalTitle,{color:colors.text}]}>{t('profile')}</Text>
          <Text style={[styles.modalLabel,{color:colors.textSecondary}]}>{t('nickname')}</Text>
          <TextInput style={[styles.modalInput,{backgroundColor:colors.bg,color:colors.text,borderColor:colors.border}]} placeholder={t('nickname')} placeholderTextColor={colors.textMuted} value={myNickname} onChangeText={t=>{setMyNickname(t);if(socketRef.current)socketRef.current.emit('update-profile',{pairCode,user:userRole,nickname:t,avatarColor:myAvatarColor});}}/>
          <Text style={[styles.modalLabel,{color:colors.textSecondary}]}>{t('color')}</Text>
          <View style={styles.colorPicker}>{AVATAR_COLORS.map((c, idx) => (<TouchableOpacity key={idx} style={[styles.colorDot,{backgroundColor: c,borderColor:myAvatarColor===c?'#fff':'transparent'}]} onPress={() => setMyAvatarColor(c)} />))}</View>
          <GradientButton onPress={()=>setShowProfileModal(false)} title={t('done')} colors={[colors.primary,'#ff6b9d']}/>
        </View></View></Modal>
      </KeyboardAvoidingView>
      <ConfettiOverlay visible={showConfetti} />
    </SafeAreaView>
  );
}

const MessageBubble = memo(({ item, userRole, colors }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current; 
  const slideAnim = useRef(new Animated.Value(50)).current;
  useEffect(() => { Animated.parallel([Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }), Animated.spring(slideAnim, { toValue: 0, friction: 8, useNativeDriver: true })]).start(); }, []);
  return (<Animated.View style={{ opacity: fadeAnim, transform: [{ translateX: slideAnim }] }}><View style={[styles.msgBubble, item.user_id === userRole ? styles.msgMe : styles.msgPartner]}>
    {item.media_url ? <Image source={{ uri: item.media_url }} style={styles.mediaImage} /> : null}
    <Text style={[styles.msgNick, { color: colors.textSecondary }]}>{item.nickname || item.user_id}</Text>
    <Text style={[styles.msgText, { color: colors.text }]}>{item.text}</Text>
    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 4, marginTop: 4, alignItems: 'center' }}>
      <Text style={[styles.msgTime, { color: colors.textSecondary }]}>{item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</Text>
      {item.user_id === userRole && (<Text style={styles.msgHeart}>{item.read_by_partner ? '❤️' : item.temp ? '⏳' : '🤍'}</Text>)}
      {item.reaction && <Text style={{ fontSize: 16 }}>{item.reaction}</Text>}
    </View>
  </View></Animated.View>);
});

const styles = StyleSheet.create({
  safeArea:{flex:1},container:{flex:1},loading:{flex:1,justifyContent:'center',alignItems:'center'},loadingText:{marginTop:16,fontSize:16},errorContainer:{flex:1,justifyContent:'center',alignItems:'center',padding:30},errorIcon:{fontSize:64,marginBottom:20},errorTitle:{fontSize:24,fontWeight:'700',marginBottom:20},
  onboardingContainer:{flex:1,justifyContent:'center',alignItems:'center',paddingHorizontal:40},onboardingIcon:{fontSize:80,marginBottom:24},onboardingTitle:{fontSize:28,fontWeight:'800',marginBottom:12,textAlign:'center'},onboardingDesc:{fontSize:16,textAlign:'center',lineHeight:24},dots:{flexDirection:'row',gap:8,marginVertical:32},dot:{width:8,height:8,borderRadius:4,backgroundColor:'#6b6b8a'},
  center:{flex:1,justifyContent:'center',alignItems:'center',paddingHorizontal:30},logo:{fontSize:80,marginBottom:16},title:{fontSize:48,fontWeight:'800',letterSpacing:-1,marginBottom:8},subtitle:{fontSize:18,color:'#6b7280',marginBottom:32,textAlign:'center'},
  btns:{width:'100%',gap:12},btnSecondary:{paddingVertical:18,borderRadius:16,alignItems:'center',borderWidth:1},btnSecondaryText:{fontSize:18,fontWeight:'600'},back:{padding:20},backText:{fontSize:16},sectionTitle:{fontSize:28,fontWeight:'700',marginBottom:24,textAlign:'center'},input:{width:'100%',padding:18,borderRadius:16,fontSize:24,textAlign:'center',letterSpacing:4,marginBottom:24,borderWidth:1},
  header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:20,paddingVertical:16},headerTitle:{fontSize:24,fontWeight:'800'},headerCode:{fontSize:12,marginTop:4},avatarBadge:{width:44,height:44,borderRadius:22,justifyContent:'center',alignItems:'center',borderWidth:2,borderColor:'#fff'},avatarText:{color:'#fff',fontWeight:'700',fontSize:20},scroll:{flex:1},
  statCard:{borderRadius:20,padding:20,marginBottom:16},statRow:{flexDirection:'row',justifyContent:'space-around',alignItems:'center'},statItem:{alignItems:'center'},statVal:{fontSize:28,fontWeight:'800'},statLabel:{fontSize:12,marginTop:4},divider:{width:1,height:50},
  card:{borderRadius:20,padding:20,marginBottom:16,borderWidth:1},cardHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:12},cardTitle:{fontSize:20,fontWeight:'700',marginBottom:12},addText:{fontSize:18,fontWeight:'600'},importBtn:{backgroundColor:'#1a1a35', paddingHorizontal:12, paddingVertical:8, borderRadius:10, borderWidth:1, borderColor:'#2a2a45'},importBtnText:{color:'#48cae4', fontSize:13, fontWeight:'600'},
  statusRow:{flexDirection:'row',justifyContent:'space-between',marginBottom:20},statusBadge:{flex:1,padding:16,borderRadius:16,borderWidth:1},statusText:{fontSize:13,fontWeight:'700',marginBottom:6},statusEmoji:{fontSize:32,textAlign:'center',marginVertical:6},statusDivider:{justifyContent:'center',paddingHorizontal:12},dividerDot:{fontSize:24},
  moodGrid:{flexDirection:'row',flexWrap:'wrap',gap:12},moodBtn:{width:(width-32-48-36)/4,aspectRatio:1,borderRadius:16,alignItems:'center',justifyContent:'center',borderWidth:2},moodEmoji:{fontSize:32},
  chatBox:{height:280,marginBottom:12,borderRadius:16,padding:12,borderWidth:1},chatEmptyContainer:{flex:1,justifyContent:'center',alignItems:'center'},chatEmptyIcon:{fontSize:56,marginBottom:12},chatEmpty:{textAlign:'center',fontSize:16,fontWeight:'600'},msgBubble:{maxWidth:'85%',padding:14,borderRadius:18,marginBottom:10},msgMe:{backgroundColor:'#ff4d6d',alignSelf:'flex-end',borderBottomRightRadius:6},msgPartner:{backgroundColor:'#1a1a35',alignSelf:'flex-start',borderBottomLeftRadius:6},mediaImage:{width:150,height:150,borderRadius:12,marginBottom:8},msgNick:{fontSize:12,fontWeight:'700',marginBottom:4,opacity:0.8},msgText:{fontSize:15},msgTime:{fontSize:10},msgHeart:{fontSize:14},typingText:{fontSize:13,fontStyle:'italic',marginTop:8},chatInputRow:{flexDirection:'row',gap:10,marginTop:12,alignItems:'center'},attachBtn:{width:48,height:48,borderRadius:14,alignItems:'center',justifyContent:'center'},attachText:{fontSize:22},chatInput:{flex:1,padding:14,borderRadius:16,borderWidth:1,fontSize:15},sendBtn:{width:54,borderRadius:16,overflow:'hidden'},sendBtnGradient:{width:54,height:50,justifyContent:'center',alignItems:'center'},sendText:{color:'#fff',fontSize:22,fontWeight:'700'},
  textArea:{padding:16,borderRadius:16,fontSize:15,minHeight:100,marginBottom:16,borderWidth:1},
  gradientButton:{paddingVertical:16,borderRadius:16,alignItems:'center',flexDirection:'row',justifyContent:'center'},buttonIcon:{fontSize:20,marginRight:8},buttonText:{color:'#fff',fontSize:18,fontWeight:'700'},actionButton:{borderRadius:20,overflow:'hidden',borderWidth:1},actionButtonGradient:{paddingVertical:20,alignItems:'center'},sleepBlock:{alignItems:'center',paddingVertical:40,borderRadius:16,marginBottom:12},sleepBlockTitle:{fontSize:22,fontWeight:'700',marginBottom:8},
  modalOverlay:{flex:1,backgroundColor:'rgba(0,0,0,0.85)',justifyContent:'center',alignItems:'center'},modalContent:{width:'85%',borderRadius:24,padding:28,borderWidth:1,maxHeight:'80%'},settingsContent:{width:'90%',borderRadius:24,padding:24,borderWidth:1,maxHeight:'90%'},settingsHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:24},settingsTitle:{fontSize:26,fontWeight:'800'},settingSection:{marginBottom:24},settingSectionTitle:{fontSize:16,fontWeight:'700',marginBottom:12,textTransform:'uppercase'},settingItem:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:12,borderBottomWidth:1,borderBottomColor:'#2a2a45'},settingInfo:{flex:1},settingLabel:{fontSize:16,fontWeight:'600'},settingButton:{padding:14,borderRadius:12,marginTop:12,alignItems:'center'},settingButtonText:{fontWeight:'600'},toggle:{width:52,height:32,borderRadius:16,backgroundColor:'#141428',padding:4,justifyContent:'center'},toggleCircle:{width:24,height:24,borderRadius:12},modalTitle:{fontSize:26,fontWeight:'800',marginBottom:24,textAlign:'center'},modalLabel:{fontSize:14,marginBottom:8,fontWeight:'600'},modalInput:{padding:14,borderRadius:16,marginBottom:20,borderWidth:1},datePickerContainer:{borderRadius:12,marginBottom:20,overflow:'hidden'},
  dateItem:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',padding:12,borderRadius:12,marginBottom:8},dateInfo:{flex:1},dateTitle:{fontSize:15,fontWeight:'700'},dateValue:{fontSize:13,marginTop:2},deleteIcon:{fontSize:20,padding:8},emptyText:{textAlign:'center',padding:20},
  achievementsGridCompact:{flexDirection:'row',flexWrap:'wrap',gap:8,padding:4},achievementItemCompact:{width:70,height:70,borderRadius:12,alignItems:'center',justifyContent:'center',padding:4,borderWidth:2},achievementIconSmall:{fontSize:24,marginBottom:2},achievementTitleSmall:{fontSize:9,textAlign:'center',fontWeight:'600'},
  achievementsGrid:{flexDirection:'row',flexWrap:'wrap',gap:12},achievementItem:{width:(width-32-48-24)/4,aspectRatio:1,borderRadius:16,alignItems:'center',justifyContent:'center',padding:12,borderWidth:2},achievementIcon:{fontSize:32,marginBottom:6},achievementTitle:{fontSize:11,textAlign:'center',fontWeight:'600'},
  pinContainer:{flex:1,justifyContent:'center',alignItems:'center'},pinIcon:{fontSize:64,marginBottom:24},pinTitle:{fontSize:24,fontWeight:'700',marginBottom:32},pinInputContainer:{flexDirection:'row',gap:16,marginBottom:32},pinDot:{width:16,height:16,borderRadius:8},pinInputHidden:{position:'absolute',opacity:0,width:1,height:1},pinCancel:{fontSize:16},
  pulseContainer:{alignItems:'center',paddingVertical:24,marginBottom:16,borderRadius:20,borderWidth:1},pulseHeartGradient:{width:90,height:90,borderRadius:45,justifyContent:'center',alignItems:'center',marginBottom:12},pulseHeart:{fontSize:52},pulseText:{fontSize:20,fontWeight:'800'},
  floatingWidget: { position: 'absolute', bottom: 80, right: 20 }, floatingBtn: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 }, floatingText: { fontSize: 10, fontWeight: '700', marginTop: -2 }, closeWidget: { position: 'absolute', top: -10, right: -10, backgroundColor: '#000', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  themeBtn: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1 }, calendarItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#0a0a14', borderRadius: 10, marginBottom: 8 },
  reactionsPicker: { flexDirection: 'row', gap: 16, padding: 20, backgroundColor: '#141428', borderRadius: 20, borderWidth: 1, borderColor: '#2a2a45' }, reactionBtn: { padding: 12, borderRadius: 12, backgroundColor: '#0a0a14' },
  themeOption: { width: 100, height: 60, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  confettiContainer: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 9999, pointerEvents: 'none' },
  colorPicker: { flexDirection: 'row', gap: 12, marginTop: 8, justifyContent: 'center' }, colorDot: { width: 36, height: 36, borderRadius: 18, borderWidth: 3 },
  settingButtonModern: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#ffffff10', borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#2a2a45' },
  settingItemModern: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#ffffff10', borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#2a2a45' },
  langBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 2 }
});

export default function App() { return <ErrorBoundary><AppContent /></ErrorBoundary>; }