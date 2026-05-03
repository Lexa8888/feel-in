import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView,
  SafeAreaView, Alert, ActivityIndicator, Animated, Dimensions,
  FlatList, Modal, Platform, StatusBar, KeyboardAvoidingView,
  Image, Easing, InteractionManager
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';
import { createClient } from '@supabase/supabase-js';

// 🎯 CONFIG — ✅ ОБНОВЛЕНО С НОВЫМИ ДАННЫМИ
const CONFIG = {
  SUPABASE_URL: 'https://lslsvzpraiobchxvncdo.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_r8KH-Zuqv-j5mS4DDjDQZw_RtG81TcK',
  SERVER_URL: 'https://feel-in.onrender.com'
};

const IS_WEB = Platform.OS === 'web';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 🎨 Темы
const themes = {
  dark: { bg: '#0f0f1e', card: '#1a1a2e', text: '#ffffff', textMuted: '#a0a0b0', accent: '#ff6b9d', secondary: '#6b72ff', success: '#4ade80', warning: '#fbbf24', error: '#f87171', border: '#2a2a45' },
  light: { bg: '#f8fafc', card: '#ffffff', text: '#1e293b', textMuted: '#64748b', accent: '#ec4899', secondary: '#6366f1', success: '#22c55e', warning: '#f59e0b', error: '#ef4444', border: '#e2e8f0' },
  ocean: { bg: '#0c1929', card: '#1e3a5f', text: '#e0f2fe', textMuted: '#94a3b8', accent: '#38bdf8', secondary: '#0ea5e9', success: '#22d3ee', warning: '#fbbf24', error: '#f87171', border: '#334155' },
  sunset: { bg: '#1a0f1a', card: '#2d1b3d', text: '#fef3c7', textMuted: '#d9b38c', accent: '#f97316', secondary: '#ec4899', success: '#a7f3d0', warning: '#fcd34d', error: '#fca5a5', border: '#4b2d5c' },
  forest: { bg: '#0a1a0f', card: '#1b3a24', text: '#dcfce7', textMuted: '#86efac', accent: '#22c55e', secondary: '#16a34a', success: '#4ade80', warning: '#fbbf24', error: '#f87171', border: '#2d4a36' },
  galaxy: { bg: '#0a0a1a', card: '#1a1a3a', text: '#e0e7ff', textMuted: '#a5b4fc', accent: '#8b5cf6', secondary: '#6366f1', success: '#a78bfa', warning: '#fbbf24', error: '#f87171', border: '#333355' },
  secret: { bg: '#000000', card: '#111122', text: '#ffd700', textMuted: '#b8860b', accent: '#ff1493', secondary: '#9400d3', success: '#00ff7f', warning: '#ffa500', error: '#ff4500', border: '#333344' }
};

// 🌍 Локализация
const translations = {
  ru: {
    appTitle: 'Feel In 💑', createPair: 'Создать пару', joinPair: 'Войти по коду', yourCode: 'Ваш код:', partner: 'Партнёр', you: 'Вы', online: 'онлайн', offline: 'офлайн',
    selectGender: 'Выберите пол', male: '👨 Мужской', female: '👩 Женский', continue: 'Продолжить', myStatus: 'Моё', partnerStatus: 'Партнёр',
    partnerConnected: '🎉 Партнёр подключился!', syncMessage: 'Теперь вы можете общаться в реальном времени!',
    chatPlaceholder: 'Напишите сообщение...', send: 'Отправить', sleepMode: '🌙 Спокойной ночи', wakeUp: '☀️ Я проснулся',
    quizTitle: 'Вопрос дня', quizWaiting: 'Ожидание ответа партнёра...', quizRevealed: 'Вы оба ответили!',
    peaceRequest: '🤝 Сигнал мира', peaceSent: 'Запрос отправлен', peaceAccepted: 'Примирение принято',
    ritualTitle: '✨ Вечерний ритуал', ritualPlaceholder: 'За что вы благодарны сегодня?', ritualSave: 'Сохранить',
    settings: 'Настройки', theme: 'Тема', language: 'Язык', notifications: 'Уведомления', security: 'Безопасность',
    achievements: 'Достижения', messagesCount: 'Сообщений', streak: 'Серия дней', themeUnlocked: '🎁 Тема открыта!',
    loading: 'Загрузка...', error: 'Ошибка', retry: 'Повторить', success: 'Готово'
  },
  en: {
    appTitle: 'Feel In 💑', createPair: 'Create Pair', joinPair: 'Join with Code', yourCode: 'Your Code:', partner: 'Partner', you: 'You', online: 'online', offline: 'offline',
    selectGender: 'Select Gender', male: '👨 Male', female: '👩 Female', continue: 'Continue', myStatus: 'Mine', partnerStatus: 'Partner',
    partnerConnected: '🎉 Partner connected!', syncMessage: 'Now you can chat in real-time!',
    chatPlaceholder: 'Type a message...', send: 'Send', sleepMode: '🌙 Good night', wakeUp: '☀️ I\'m awake',
    quizTitle: 'Question of the Day', quizWaiting: 'Waiting for partner\'s answer...', quizRevealed: 'You both answered!',
    peaceRequest: '🤝 Peace Signal', peaceSent: 'Request sent', peaceAccepted: 'Reconciliation accepted',
    ritualTitle: '✨ Evening Ritual', ritualPlaceholder: 'What are you grateful for today?', ritualSave: 'Save',
    settings: 'Settings', theme: 'Theme', language: 'Language', notifications: 'Notifications', security: 'Security',
    achievements: 'Achievements', messagesCount: 'Messages', streak: 'Day Streak', themeUnlocked: '🎁 Theme Unlocked!',
    loading: 'Loading...', error: 'Error', retry: 'Retry', success: 'Done'
  }
};

// 😊 Настроение
const MOOD_EMOJIS = [
  { emoji: '😊', key: 'happy', label: 'Радость' },
  { emoji: '😌', key: 'calm', label: 'Спокойствие' },
  { emoji: '🤔', key: 'thinking', label: 'Задумчивость' },
  { emoji: '😔', key: 'sad', label: 'Грусть' },
  { emoji: '😤', key: 'frustrated', label: 'Раздражение' },
  { emoji: '😍', key: 'love', label: 'Любовь' },
  { emoji: '🤗', key: 'hug', label: 'Объятия' },
  { emoji: '🔥', key: 'fire', label: 'Огонь' }
];

// 🎯 Оптимизированный компонент сообщения
const MessageItem = memo(({ item, currentUserRole, colors }) => {
  const isMe = item.user_id === currentUserRole;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: !IS_WEB,
      easing: Easing.out(Easing.ease)
    }).start();
  }, [fadeAnim]);

  return (
    <Animated.View style={[
      styles.messageBubble,
      isMe ? styles.messageMine : styles.messagePartner,
      { backgroundColor: isMe ? colors.accent : colors.card, opacity: fadeAnim }
    ]}>
      <Text style={[styles.messageText, { color: isMe ? '#fff' : colors.text }]} 
            numberOfLines={10} ellipsizeMode="tail">
        {item.text}
      </Text>
      <Text style={[styles.messageTime, { color: isMe ? 'rgba(255,255,255,0.7)' : colors.textMuted }]}>
        {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </Animated.View>
  );
});

export default function App() {
  // 🎯 State
  const [themeMode, setThemeMode] = useState('dark');
  const [lang, setLang] = useState('ru');
  const [pairCode, setPairCode] = useState('');
  const [userRole, setUserRole] = useState(null); // 'M' or 'Ж'
  const [isCreator, setIsCreator] = useState(false);
  const [connected, setConnected] = useState(false);
  const [partnerOnline, setPartnerOnline] = useState(false);
  
  // 💬 Chat
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [typingPartner, setTypingPartner] = useState(false);
  const messagesEndRef = useRef(null);
  const messageQueue = useRef([]);
  
  // 💓 Mood & Status
  const [myMood, setMyMood] = useState(null);
  const [partnerMood, setPartnerMood] = useState(null);
  const [statusA, setStatusA] = useState(null);
  const [statusB, setStatusB] = useState(null);
  
  // 😴 Sleep Mode
  const [partnerSleeping, setPartnerSleeping] = useState(false);
  
  // ❓ Quiz
  const [quiz, setQuiz] = useState(null);
  const [myAnswer, setMyAnswer] = useState(null);
  const [partnerAnswer, setPartnerAnswer] = useState(null);
  
  // 🤝 Peace
  const [peaceActive, setPeaceActive] = useState(false);
  
  // ✨ Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const heartScale = useRef(new Animated.Value(1)).current;
  
  // 🔌 Socket & Supabase
  const socketRef = useRef(null);
  const supabase = useRef(null);
  
  const colors = themes[themeMode] || themes.dark;
  const t = translations[lang];

  // 🎯 Инициализация
  useEffect(() => {
    // Load cached settings
    const loadSettings = async () => {
      try {
        const [cachedTheme, cachedLang, cachedPair, cachedRole] = await Promise.all([
          AsyncStorage.getItem('themeMode'),
          AsyncStorage.getItem('lang'),
          AsyncStorage.getItem('pairCode'),
          AsyncStorage.getItem('userRole')
        ]);
        if (cachedTheme) setThemeMode(cachedTheme);
        if (cachedLang) setLang(cachedLang);
        if (cachedPair) setPairCode(cachedPair);
        if (cachedRole) setUserRole(cachedRole);
      } catch (e) { console.warn('Cache load error:', e); }
    };
    loadSettings();

    // Init Supabase
    supabase.current = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

    // Init Socket
    socketRef.current = io(CONFIG.SERVER_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socketRef.current.on('connect', () => {
      console.log('✅ Socket connected');
      setConnected(true);
      if (!IS_WEB) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    });

    socketRef.current.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      setConnected(false);
    });

    // 📡 Socket listeners
    socketRef.current.on('messages-loaded', (data) => {
      setMessages(data.messages || []);
      AsyncStorage.setItem(`messages_${pairCode}`, JSON.stringify(data.messages || []));
    });

    socketRef.current.on('new-message', (msg) => {
      setMessages(prev => {
        const exists = prev.some(m => m.id === msg.id);
        if (exists) return prev;
        const updated = [...prev, msg].slice(-100);
        AsyncStorage.setItem(`messages_${pairCode}`, JSON.stringify(updated));
        return updated;
      });
      if (!IS_WEB) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      scrollToBottom();
    });

    socketRef.current.on('status-updated', (data) => {
      // 🔥 CRITICAL: Respect role separation
      if (data.userRole === 'M') {
        setStatusA(data.mood);
        if (userRole === 'Ж') setPartnerMood(data.mood);
      } else {
        setStatusB(data.mood);
        if (userRole === 'M') setPartnerMood(data.mood);
      }
    });

    socketRef.current.on('quiz-updated', (data) => {
      setQuiz(data.quiz);
      // 🔥 CRITICAL: Separate answers by role
      if (data.quiz.ans_a && data.quiz.ans_b) {
        if (userRole === 'M') {
          setMyAnswer(data.quiz.ans_a);
          setPartnerAnswer(data.quiz.ans_b);
        } else {
          setMyAnswer(data.quiz.ans_b);
          setPartnerAnswer(data.quiz.ans_a);
        }
      } else {
        if (userRole === 'M') {
          if (data.quiz.ans_a) setMyAnswer(data.quiz.ans_a);
          else setMyAnswer(null);
        } else {
          if (data.quiz.ans_b) setMyAnswer(data.quiz.ans_b);
          else setMyAnswer(null);
        }
      }
    });

    socketRef.current.on('sleep-updated', (data) => {
      if (data.userRole !== userRole) {
        setPartnerSleeping(data.sleeping);
      }
    });

    socketRef.current.on('partner-typing', () => setTypingPartner(true));
    socketRef.current.on('partner-stopped-typing', () => setTypingPartner(false));
    
    socketRef.current.on('peace-updated', (data) => {
      setPeaceActive(data.active);
      if (data.active && !IS_WEB) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        startHeartPulse();
      }
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  // 🔄 Cache messages on mount
  useEffect(() => {
    if (pairCode && userRole) {
      const loadCached = async () => {
        try {
          const cached = await AsyncStorage.getItem(`messages_${pairCode}`);
          if (cached) setMessages(JSON.parse(cached));
        } catch (e) { console.warn('Cache parse error:', e); }
      };
      loadCached();
    }
  }, [pairCode, userRole]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollToEnd({ animated: true });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  const startHeartPulse = useCallback(() => {
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1.3, useNativeDriver: !IS_WEB }),
      Animated.spring(heartScale, { toValue: 1, useNativeDriver: !IS_WEB })
    ]).start();
  }, [heartScale]);

  // 🎯 Join/Create pair with gender logic
  const handleJoinPair = async () => {
    if (!pairCode.trim()) return;
    
    try {
      const cleanCode = pairCode.trim().toUpperCase().replace('FEEL-', '');
      const { data: pair } = await supabase.current
        .from('pairs')
        .select('*')
        .eq('code', cleanCode)
        .single();

      if (pair) {
        const myGender = pair.gender_a === 'M' ? 'Ж' : 'M';
        setUserRole(myGender);
        setIsCreator(false);
        await AsyncStorage.setItem('userRole', myGender);
        await AsyncStorage.setItem('pairCode', cleanCode);
      } else {
        setIsCreator(true);
        await AsyncStorage.setItem('pairCode', cleanCode);
        return;
      }

      socketRef.current.emit('join-pair', { pairCode: cleanCode, userRole: userRole || (pair ? (pair.gender_a === 'M' ? 'Ж' : 'M') : null) });
      
      setTimeout(() => {
        socketRef.current.emit('load-messages', { pairCode: cleanCode });
        socketRef.current.emit('get-profiles', { pairCode: cleanCode });
      }, 500);

      if (!IS_WEB) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Alert.alert(t.error, e.message);
    }
  };

  const handleSetGender = async (gender) => {
    try {
      setUserRole(gender);
      await AsyncStorage.setItem('userRole', gender);
      
      const { data, error } = await supabase.current
        .from('pairs')
        .insert([{ 
          code: pairCode.trim().toUpperCase().replace('FEEL-', ''),
          gender_a: gender,
          gender_b: gender === 'M' ? 'Ж' : 'M'
        }])
        .select()
        .single();

      if (error) throw error;

      socketRef.current.emit('join-pair', { pairCode: pairCode.trim().toUpperCase().replace('FEEL-', ''), userRole: gender });
      
      setTimeout(() => {
        socketRef.current.emit('load-messages', { pairCode: pairCode.trim().toUpperCase().replace('FEEL-', '') });
      }, 500);

      if (!IS_WEB) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Alert.alert(t.error, e.message);
    }
  };

  const handleSendMessage = useCallback(() => {
    if (!newMessage.trim() || !pairCode || !userRole) return;
    
    const tempId = `temp_${Date.now()}`;
    const optimisticMsg = {
      id: tempId,
      pair_code: pairCode,
      user_id: userRole,
      text: newMessage.trim(),
      created_at: new Date().toISOString(),
      read_by_partner: false
    };

    setMessages(prev => [...prev, optimisticMsg].slice(-100));
    setNewMessage('');
    scrollToBottom();
    
    if (!IS_WEB) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    socketRef.current.emit('send-message', {
      pairCode,
      userId: userRole,
      text: optimisticMsg.text,
      tempId
    });

    messageQueue.current.push(optimisticMsg);
    AsyncStorage.setItem(`message_queue_${pairCode}`, JSON.stringify(messageQueue.current));
  }, [newMessage, pairCode, userRole]);

  const handleMoodSelect = (moodKey) => {
    setMyMood(moodKey);
    
    const payload = {
      pairCode,
      userId: userRole,
      mood: moodKey,
      statusField: userRole === 'M' ? 'statusA' : 'statusB'
    };
    
    socketRef.current.emit('update-status', payload);
    
    if (!IS_WEB) {
      Haptics.selectionAsync();
      startHeartPulse();
    }
  };

  const handleQuizSubmit = (answer) => {
    setMyAnswer(answer);
    
    const payload = {
      pairCode,
      userId: userRole,
      answer,
      answerField: userRole === 'M' ? 'ans_a' : 'ans_b'
    };
    
    socketRef.current.emit('quiz-submit', payload);
    
    if (!IS_WEB) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleSleepToggle = () => {
    const newSleepState = !partnerSleeping;
    setPartnerSleeping(newSleepState);
    
    socketRef.current.emit('sleep-toggle', {
      pairCode,
      userId: userRole,
      sleeping: newSleepState
    });
    
    if (!IS_WEB) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleThemeChange = async (theme) => {
    setThemeMode(theme);
    await AsyncStorage.setItem('themeMode', theme);
    if (!IS_WEB) Haptics.selectionAsync();
  };

  const handleLangChange = async (newLang) => {
    setLang(newLang);
    await AsyncStorage.setItem('lang', newLang);
  };

  // 🚀 Render
  if (!userRole) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        <StatusBar barStyle="light-content" />
        <View style={styles.centered}>
          <Text style={[styles.title, { color: colors.text }]}>{t.appTitle}</Text>
          
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
            placeholder={t.joinPair}
            placeholderTextColor={colors.textMuted}
            value={pairCode}
            onChangeText={setPairCode}
            maxLength={6}
            autoCapitalize="characters"
          />
          
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: colors.accent }]}
            onPress={handleJoinPair}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>{isCreator ? t.createPair : t.joinPair}</Text>
          </TouchableOpacity>

          {isCreator && (
            <Modal visible transparent animationType="fade">
              <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>{t.selectGender}</Text>
                  <TouchableOpacity 
                    style={[styles.genderBtn, { borderColor: colors.secondary }]}
                    onPress={() => handleSetGender('M')}
                  >
                    <Text style={styles.genderBtnText}>{t.male}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.genderBtn, { borderColor: colors.accent }]}
                    onPress={() => handleSetGender('Ж')}
                  >
                    <Text style={styles.genderBtnText}>{t.female}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          )}
        </View>
      </SafeAreaView>
    );
  }

  if (partnerSleeping) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={styles.sleepBlock}>
          <Animated.Text style={[styles.sleepEmoji, { color: colors.accent }]}>{partnerSleeping ? '🌙' : '☀️'}</Animated.Text>
          <Text style={[styles.sleepText, { color: colors.text }]}>{partnerSleeping ? t.sleepMode : t.wakeUp}</Text>
          <TouchableOpacity 
            style={[styles.sleepBtn, { backgroundColor: colors.secondary }]}
            onPress={handleSleepToggle}
          >
            <Text style={styles.sleepBtnText}>{partnerSleeping ? t.wakeUp : t.sleepMode}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle="light-content" />
      
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">{t.appTitle}</Text>
        <View style={styles.statusRow}>
          <View style={styles.statusItem}>
            <Text style={[styles.statusLabel, { color: colors.textMuted }]}>{t.myStatus}</Text>
            <TouchableOpacity onPress={() => handleMoodSelect(myMood || MOOD_EMOJIS[0].key)}>
              <Text style={styles.statusEmoji}>{MOOD_EMOJIS.find(m => m.key === (userRole === 'M' ? statusA : statusB))?.emoji || '😊'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.statusItem}>
            <Text style={[styles.statusLabel, { color: colors.textMuted }]}>{t.partnerStatus}</Text>
            <View style={styles.partnerStatus}>
              <Text style={styles.statusEmoji}>{MOOD_EMOJIS.find(m => m.key === (userRole === 'M' ? statusB : statusA))?.emoji || '😊'}</Text>
              <View style={[styles.onlineDot, { backgroundColor: partnerOnline ? colors.success : colors.error }]} />
            </View>
          </View>
        </View>
      </View>

      {quiz && (
        <View style={[styles.quizCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.quizQuestion, { color: colors.text }]} numberOfLines={2} ellipsizeMode="tail">{quiz.question}</Text>
          {!myAnswer ? (
            <View style={styles.quizOptions}>
              {['Да ❤️', 'Нет 💙', 'Может 🤔'].map((opt, i) => (
                <TouchableOpacity 
                  key={i}
                  style={[styles.quizBtn, { backgroundColor: colors.secondary }]}
                  onPress={() => handleQuizSubmit(opt)}
                >
                  <Text style={styles.quizBtnText}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : partnerAnswer ? (
            <View style={styles.quizRevealed}>
              <Text style={[styles.quizAnswer, { color: colors.text }]}>{t.quizRevealed}</Text>
              <Text style={[styles.quizResult, { color: colors.accent }]}>
                {userRole === 'M' ? `Вы: ${myAnswer} | Партнёр: ${partnerAnswer}` : `Вы: ${myAnswer} | Партнёр: ${partnerAnswer}`}
              </Text>
            </View>
          ) : (
            <Text style={[styles.quizWaiting, { color: colors.textMuted }]}>{t.quizWaiting}</Text>
          )}
        </View>
      )}

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MessageItem item={item} currentUserRole={userRole} colors={colors} />}
        contentContainerStyle={styles.chatList}
        initialNumToRender={10}
        maxToRenderPerBatch={5}
        windowSize={10}
        removeClippedSubviews={true}
        onEndReachedThreshold={0.5}
      />
      {typingPartner && (
        <Text style={[styles.typingIndicator, { color: colors.textMuted }]}>Партнёр печатает...</Text>
      )}
      <View ref={messagesEndRef} />

      <KeyboardAvoidingView behavior={IS_WEB ? 'padding' : 'height'} keyboardVerticalOffset={IS_WEB ? 0 : 10}>
        <View style={[styles.inputRow, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <TextInput
            style={[styles.chatInput, { color: colors.text, backgroundColor: colors.bg }]}
            placeholder={t.chatPlaceholder}
            placeholderTextColor={colors.textMuted}
            value={newMessage}
            onChangeText={setNewMessage}
            onSubmitEditing={handleSendMessage}
            returnKeyType="send"
            blurOnSubmit={false}
          />
          <TouchableOpacity 
            style={[styles.sendBtn, { backgroundColor: colors.accent }]}
            onPress={handleSendMessage}
            disabled={!newMessage.trim()}
          >
            <Text style={styles.sendBtnText}>{t.send}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Animated.View 
        style={[
          styles.heartWidget,
          { transform: [{ scale: heartScale }], backgroundColor: colors.accent }
        ]}
      >
        <TouchableOpacity onPress={() => { startHeartPulse(); if (!IS_WEB) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); }}>
          <Text style={styles.heartEmoji}>💓</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 32, textAlign: 'center' },
  input: { width: '100%', padding: 16, borderRadius: 14, fontSize: 16, marginBottom: 16, borderWidth: 1 },
  button: { width: '100%', padding: 16, borderRadius: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', padding: 24, borderRadius: 20, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 20 },
  genderBtn: { width: '100%', padding: 14, borderRadius: 12, alignItems: 'center', marginBottom: 12, borderWidth: 2 },
  genderBtnText: { fontSize: 16, fontWeight: '600' },
  
  header: { padding: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 12 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statusItem: { alignItems: 'center' },
  statusLabel: { fontSize: 12, marginBottom: 4 },
  statusEmoji: { fontSize: 28 },
  partnerStatus: { position: 'relative' },
  onlineDot: { position: 'absolute', bottom: 2, right: 0, width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: '#fff' },
  
  quizCard: { margin: 16, padding: 16, borderRadius: 16, borderWidth: 1 },
  quizQuestion: { fontSize: 16, fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  quizOptions: { flexDirection: 'row', justifyContent: 'space-around' },
  quizBtn: { padding: 10, borderRadius: 10, minWidth: 70, alignItems: 'center' },
  quizBtnText: { color: '#fff', fontWeight: '600' },
  quizRevealed: { alignItems: 'center' },
  quizAnswer: { fontSize: 14, marginBottom: 8 },
  quizResult: { fontSize: 16, fontWeight: '700' },
  quizWaiting: { textAlign: 'center', fontStyle: 'italic' },
  
  chatList: { padding: 12, flexGrow: 1 },
  messageBubble: { maxWidth: '75%', padding: 12, borderRadius: 18, marginBottom: 8, alignSelf: 'flex-end' },
  messageMine: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  messagePartner: { alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  messageText: { fontSize: 15, lineHeight: 20 },
  messageTime: { fontSize: 10, marginTop: 4, textAlign: 'right' },
  
  inputRow: { flexDirection: 'row', padding: 12, borderTopWidth: 1, alignItems: 'center' },
  chatInput: { flex: 1, padding: 12, borderRadius: 20, fontSize: 15, maxHeight: 100 },
  sendBtn: { marginLeft: 8, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 20 },
  sendBtnText: { color: '#fff', fontWeight: '700' },
  
  typingIndicator: { paddingHorizontal: 16, paddingVertical: 4, fontSize: 12, fontStyle: 'italic' },
  
  heartWidget: { position: 'absolute', top: 20, right: 20, width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6 },
  heartEmoji: { fontSize: 24 },
  
  sleepBlock: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  sleepEmoji: { fontSize: 64, marginBottom: 24 },
  sleepText: { fontSize: 20, fontWeight: '600', marginBottom: 24, textAlign: 'center' },
  sleepBtn: { paddingVertical: 14, paddingHorizontal: 32, borderRadius: 14 },
  sleepBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' }
});