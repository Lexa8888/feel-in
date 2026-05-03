import React, { useState, useEffect, useRef, Platform } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView,
  SafeAreaView, Alert, KeyboardAvoidingView,
  ActivityIndicator, Animated, Dimensions, FlatList, Modal, AppState
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { io } from 'socket.io-client';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { createClient } from '@supabase/supabase-js';

// 🔐 КОНФИГУРАЦИЯ
const CONFIG = {
  SERVER_URL: 'https://feel-in.onrender.com',
  SUPABASE_URL: 'https://jgpcuebyysxkrdqkvqmz.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_xQWX7_juECMQlPzwW-cb9w_CLszetYD',
  EXPO_PROJECT_ID: '0636e412-9635-4a63-a35d-bf97572f3861',
  PAIR_CODE_PREFIX: 'FEEL-'
};

const { width } = Dimensions.get('window');
const IS_WEB = Platform.OS === 'web';
const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

const colors = {
  bg: '#0f0f1e',
  bgCard: '#1a1a2e',
  primary: '#ff6b9d',
  secondary: '#6b72ff',
  accent: '#c77dff',
  success: '#4ade80',
  warning: '#fbbf24',
  text: '#ffffff',
  textSecondary: '#a0a0b0',
  textMuted: '#64748b',
  border: '#2a2a45',
  msgMe: '#ff6b9d',
  msgPartner: '#1a1a35'
};

const MOOD_EMOJIS = [
  { emoji: '😊', key: 'happy' },
  { emoji: '😔', key: 'sad' },
  { emoji: '😍', key: 'love' },
  { emoji: '🤗', key: 'hug' },
  { emoji: '🥰', key: 'adore' },
  { emoji: '😤', key: 'angry' }
];

const AVATAR_COLORS = ['#ff6b9d', '#6b72ff', '#c77dff', '#4ade80', '#fbbf24', '#ff9f43'];

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('welcome');
  const [socket, setSocket] = useState(null);
  const [pairCode, setPairCode] = useState('');
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusA, setStatusA] = useState('');
  const [statusB, setStatusB] = useState('');
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState('');
  const chatListRef = useRef(null);
  const [myNickname, setMyNickname] = useState('');
  const [partnerNickname, setPartnerNickname] = useState('');
  const [myAvatarColor, setMyAvatarColor] = useState(AVATAR_COLORS[0]);
  const [partnerAvatarColor, setPartnerAvatarColor] = useState(AVATAR_COLORS[1]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [moodHistory, setMoodHistory] = useState([]);
  const [ritualText, setRitualText] = useState('');
  const [diaryText, setDiaryText] = useState('');
  const [diary, setDiary] = useState([]);
  const [peaceActive, setPeaceActive] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [daysTogether, setDaysTogether] = useState(0);
  const [streak, setStreak] = useState(0);
  const [partnerSleeping, setPartnerSleeping] = useState(false);
  const [showSleepOverlay, setShowSleepOverlay] = useState(false);
  const [showMoodChart, setShowMoodChart] = useState(false);
  const [unlockedAchievements, setUnlockedAchievements] = useState([]);
  const [totalMessages, setTotalMessages] = useState(0);
  const [pulseScore, setPulseScore] = useState(0);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const socketRef = useRef(null);
  const [fadeIn] = useState(new Animated.Value(0));
  const heartAnims = useRef({});
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      try {
        const saved = await AsyncStorage.getItem('pairData');
        if (saved && isMounted) {
          const p = JSON.parse(saved);
          setPairCode(p.pairCode);
          setUserRole(p.userRole);
          setCurrentScreen('main');
        }
        const start = await AsyncStorage.getItem('relationshipStart');
        if (start) setDaysTogether(Math.max(0, Math.floor((Date.now() - new Date(start)) / 86400000)));
        const s = await AsyncStorage.getItem('ritualStreak');
        const m = await AsyncStorage.getItem('chatMessages');
        const t = await AsyncStorage.getItem('totalMessages');
        const u = await AsyncStorage.getItem('unlockedAchievements');
        const n = await AsyncStorage.getItem('myNickname');
        const c = await AsyncStorage.getItem('myAvatarColor');
        if (s) setStreak(parseInt(s));
        if (m) setMessages(JSON.parse(m));
        if (t) setTotalMessages(parseInt(t));
        if (u) setUnlockedAchievements(JSON.parse(u));
        if (n) setMyNickname(n);
        if (c) setMyAvatarColor(c);
        if (isMounted) {
          setIsInitialized(true);
          Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: !IS_WEB }).start();
        }
      } catch (e) {
        if (isMounted) setIsInitialized(true);
      }
    };
    init();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (!isInitialized || currentScreen !== 'main' || !pairCode || !userRole) return;
    if (socketRef.current) socketRef.current.disconnect();
    
    const newSocket = io(CONFIG.SERVER_URL, { transports: ['websocket', 'poll'] });
    
    newSocket.on('connect', () => {
      newSocket.emit('join-pair', { pairCode: pairCode.replace('FEEL-', ''), userRole });
      newSocket.emit('get-profiles', { pairCode: pairCode.replace('FEEL-', '') });
      newSocket.emit('load-messages', { pairCode: pairCode.replace('FEEL-', '') });
      newSocket.emit('load-mood-history', { pairCode: pairCode.replace('FEEL-', '') });
      if (myNickname) {
        newSocket.emit('update-profile', {
          pairCode: pairCode.replace('FEEL-', ''),
          user: userRole,
          nickname: myNickname,
          avatarColor: myAvatarColor
        });
      }
      if (Device.isDevice) {
        Notifications.requestPermissionsAsync().then(res => {
          if (res.status === 'granted') {
            Notifications.getExpoPushTokenAsync({ projectId: CONFIG.EXPO_PROJECT_ID }).then(t =>
              newSocket.emit('register-push-token', { user: userRole, token: t.data, pairCode: pairCode.replace('FEEL-', '') })
            );
          }
        });
      }
    });

    newSocket.on('profiles-loaded', (profiles) => {
      const me = profiles.find(p => p.user_id === userRole);
      const partner = profiles.find(p => p.user_id !== userRole);
      if (me) {
        setMyNickname(me.nickname || '');
        setMyAvatarColor(me.avatar_color || AVATAR_COLORS[0]);
      }
      if (partner) {
        setPartnerNickname(partner.nickname || 'Партнёр');
        setPartnerAvatarColor(partner.avatar_color || AVATAR_COLORS[1]);
      }
    });

    newSocket.on('profile-updated', ({ user, nickname, avatarColor }) => {
      if (user === userRole) return;
      setPartnerNickname(nickname || 'Партнёр');
      setPartnerAvatarColor(avatarColor || AVATAR_COLORS[1]);
    });

    newSocket.on('messages-loaded', (msgs) => {
      setMessages(msgs || []);
      AsyncStorage.setItem('chatMessages', JSON.stringify(msgs || [])).catch(() => {});
    });

    newSocket.on('new-message', (msg) => {
      setMessages(prev => {
        const updated = [...prev, msg];
        AsyncStorage.setItem('chatMessages', JSON.stringify(updated)).catch(() => {});
        return updated;
      });
      if (msg.user_id !== userRole) {
        newSocket.emit('mark-read', {
          pairCode: pairCode.replace('FEEL-', ''),
          messageId: msg.id,
          reader: userRole
        });
        if (!IS_WEB) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    });

    newSocket.on('message-sent', (msg) => {
      setMessages(prev => {
        const updated = [...prev, msg];
        AsyncStorage.setItem('chatMessages', JSON.stringify(updated)).catch(() => {});
        return updated;
      });
    });

    newSocket.on('message-read', ({ messageId }) => {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, read_by_partner: true } : m));
      if (!heartAnims.current[messageId]) {
        heartAnims.current[messageId] = new Animated.Value(0);
      }
      Animated.sequence([
        Animated.timing(heartAnims.current[messageId], { toValue: 1, duration: 150, useNativeDriver: !IS_WEB }),
        Animated.timing(heartAnims.current[messageId], { toValue: 0, duration: 150, useNativeDriver: !IS_WEB }),
        Animated.timing(heartAnims.current[messageId], { toValue: 1, duration: 150, useNativeDriver: !IS_WEB }),
      ]).start(() => setTimeout(() => delete heartAnims.current[messageId], 400));
      if (!IS_WEB) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    });

    newSocket.on('partner-typing', ({ nickname }) => setPartnerTyping(nickname || 'Партнёр'));
    newSocket.on('partner-stopped-typing', () => setPartnerTyping(''));
    newSocket.on('status-updated', ({ user, value }) => {
      if (user === 'M') setStatusA(value);
      else setStatusB(value);
    });
    newSocket.on('mood-history-loaded', (history) => setMoodHistory(history || []));
    newSocket.on('ritual-updated', () => Alert.alert('❤️ Ритуал', 'Партнёр написал!'));
    newSocket.on('diary-updated', (d) => setDiary(d.diary || []));
    newSocket.on('peace-updated', (d) => {
      setPeaceActive(d.active);
      if (d.active && d.from !== userRole) Alert.alert('🤝 Мир', 'Партнёр хочет помириться!');
    });
    newSocket.on('streak-updated', ({ streak: s }) => {
      setStreak(s);
      AsyncStorage.setItem('ritualStreak', s.toString()).catch(() => {});
    });
    newSocket.on('sleep-updated', ({ active, user }) => {
      const isPartner = user && user !== userRole;
      setPartnerSleeping(isPartner && active);
      setShowSleepOverlay(isPartner && active);
    });

    socketRef.current = newSocket;
    setSocket(newSocket);
    return () => { if (newSocket) newSocket.disconnect(); };
  }, [currentScreen, pairCode, userRole, isInitialized]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        if (partnerSleeping && socketRef.current) {
          setShowSleepOverlay(false);
        }
      }
      appState.current = nextAppState;
    });
    return () => subscription.remove();
  }, [partnerSleeping]);

  useEffect(() => {
    let score = 0;
    if (statusA && statusB && statusA === statusB) score += 40;
    else if (statusA || statusB) score += 15;
    if (streak > 0) score += Math.min(30, streak * 3);
    if (messages.length > 0) score += Math.min(20, Math.floor(messages.length / 10));
    setPulseScore(Math.min(100, score));
  }, [statusA, statusB, streak, messages.length]);

  useEffect(() => {
    if (chatListRef.current && messages.length > 0) {
      setTimeout(() => chatListRef.current.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const savePair = async (code, role) => {
    await AsyncStorage.setItem('pairData', JSON.stringify({
      pairCode: 'FEEL-' + code,
      userRole: role,
      timestamp: Date.now()
    }));
    if (!await AsyncStorage.getItem('relationshipStart')) {
      await AsyncStorage.setItem('relationshipStart', new Date().toISOString());
    }
  };

  const createPair = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${CONFIG.SERVER_URL}/api/pair/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setPairCode(d.code);
      setUserRole('M');
      setCurrentScreen('main');
      await savePair(d.code, 'M');
    } catch {
      Alert.alert('Ошибка', 'Не удалось создать пару');
    } finally {
      setLoading(false);
    }
  };

  const joinPair = async () => {
    if (!pairCode.trim()) return Alert.alert('Ошибка', 'Введите код');
    setLoading(true);
    try {
      const res = await fetch(`${CONFIG.SERVER_URL}/api/pair/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: pairCode.toUpperCase().replace('FEEL-', '') })
      });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setPairCode('FEEL-' + d.pair.code);
      setUserRole('Ж');
      setCurrentScreen('main');
      await savePair(d.pair.code, 'Ж');
    } catch {
      Alert.alert('Ошибка', 'Не удалось присоединиться');
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = () => {
    if (!myNickname.trim()) return Alert.alert('Ошибка', 'Введите никнейм');
    socketRef.current.emit('update-profile', {
      pairCode: pairCode.replace('FEEL-', ''),
      user: userRole,
      nickname: myNickname,
      avatarColor: myAvatarColor
    });
    AsyncStorage.setItem('myNickname', myNickname).catch(() => {});
    AsyncStorage.setItem('myAvatarColor', myAvatarColor).catch(() => {});
    setShowProfileModal(false);
  };

  const sendMessage = () => {
    if (!chatInput.trim() || !socketRef.current || partnerSleeping) return;
    socketRef.current.emit('typing-stop', { pairCode: pairCode.replace('FEEL-', ''), user: userRole });
    socketRef.current.emit('send-message', {
      code: pairCode.replace('FEEL-', ''),
      user: userRole,
      text: chatInput.trim(),
      nickname: myNickname || userRole
    });
    setChatInput('');
    setTotalMessages(prev => {
      const n = prev + 1;
      AsyncStorage.setItem('totalMessages', n.toString()).catch(() => {});
      return n;
    });
  };

  const handleChatInput = (text) => {
    setChatInput(text);
    if (partnerSleeping) return;
    if (text.length > 0 && !isTyping) {
      setIsTyping(true);
      socketRef.current.emit('typing-start', {
        pairCode: pairCode.replace('FEEL-', ''),
        user: userRole,
        nickname: myNickname || userRole
      });
    } else if (text.length === 0 && isTyping) {
      setIsTyping(false);
      socketRef.current.emit('typing-stop', { pairCode: pairCode.replace('FEEL-', ''), user: userRole });
    }
  };

  const completeRitual = () => {
    if (!ritualText.trim() || !socketRef.current) return;
    socketRef.current.emit('complete-ritual', {
      code: pairCode.replace('FEEL-', ''),
      user: userRole,
      text: ritualText
    });
    setRitualText('');
    Alert.alert('✨ Готово!');
  };

  const addDiary = () => {
    if (!diaryText.trim() || !socketRef.current) return;
    socketRef.current.emit('add-diary', {
      code: pairCode.replace('FEEL-', ''),
      user: userRole,
      text: diaryText
    });
    setDiaryText('');
    Alert.alert('📝 Сохранено');
  };

  const sendPeace = () => {
    if (!socketRef.current) return;
    socketRef.current.emit('peace-request', {
      code: pairCode.replace('FEEL-', ''),
      user: userRole
    });
    setPeaceActive(true);
    Alert.alert('🤝 Отправлено');
  };

  const updateStatus = (mood) => {
    if (!socketRef.current) return;
    socketRef.current.emit('update-status', {
      code: pairCode.replace('FEEL-', ''),
      user: userRole,
      value: mood
    });
  };

  const toggleSleep = () => {
    if (!socketRef.current) return;
    socketRef.current.emit('sleep-toggle', {
      pairCode: pairCode.replace('FEEL-', ''),
      user: userRole,
      active: true
    });
    Alert.alert('🌙 Режим сна', 'Партнёр получит уведомление. Чат заблокирован до утра.');
  };

  const wakeUp = () => {
    if (!socketRef.current) return;
    socketRef.current.emit('sleep-toggle', {
      pairCode: pairCode.replace('FEEL-', ''),
      user: userRole,
      active: false
    });
    setPartnerSleeping(false);
    setShowSleepOverlay(false);
  };

  const logout = async () => {
    if (socketRef.current) socketRef.current.disconnect();
    setSocket(null);
    setPairCode('');
    setUserRole(null);
    setCurrentScreen('welcome');
    setPeaceActive(false);
    await AsyncStorage.removeItem('pairData').catch(() => {});
  };

  const HeartStatus = ({ messageId, isRead }) => {
    const anim = heartAnims.current[messageId] || new Animated.Value(0);
    const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] });
    const opacity = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.6, 1, 0.6] });
    return (
      <Animated.Text style={[styles.msgHeart, { transform: [{ scale }], opacity }]}>
        {isRead ? '❤️❤️' : '🤍'}
      </Animated.Text>
    );
  };

  if (!isInitialized) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // ✅ ЭКРАН ПРИВЕТСТВИЯ — ИСПРАВЛЕН
  if (currentScreen === 'welcome') {
    return (
      <Animated.View style={[styles.container, { opacity: fadeIn }]}>
        <View style={styles.center}>
          {/* ✅ БЕЗ ЭМОДЗИ В ЗАГОЛОВКЕ */}
          <Text style={styles.logo}>💕</Text>
          <Text style={styles.title}>Feel In</Text>
          <Text style={styles.subtitle}>Пространство для двоих</Text>
          
          <View style={styles.btns}>
            {/* ✅ КНОПКА ВОЙТИ */}
            <TouchableOpacity style={styles.btnMain} onPress={() => setCurrentScreen('join')} disabled={loading}>
              <Text style={styles.btnText}>🔑 Войти по коду</Text>
            </TouchableOpacity>
            
            {/* ✅ КНОПКА СОЗДАТЬ */}
            <TouchableOpacity style={styles.btnSec} onPress={createPair} disabled={loading}>
              <Text style={styles.btnTextSec}>✨ Создать пару</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    );
  }

  // ЭКРАН ВХОДА
  if (currentScreen === 'join') {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.back} onPress={() => setCurrentScreen('welcome')}>
          <Text style={styles.backText}>← Назад</Text>
        </TouchableOpacity>
        <View style={styles.center}>
          <Text style={styles.sectionTitle}>Код пары</Text>
          <TextInput
            style={styles.input}
            placeholder="FEEL-XXXX"
            placeholderTextColor={colors.textMuted}
            value={pairCode}
            onChangeText={setPairCode}
            autoCapitalize="characters"
            maxLength={12}
          />
          <TouchableOpacity style={styles.btnMain} onPress={joinPair} disabled={loading}>
            <Text style={styles.btnText}>{loading ? '...' : 'Войти'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ГЛАВНЫЙ ЭКРАН
  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#1a1a35', colors.bgCard]} style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Feel In</Text>
          <Text style={styles.headerCode}>{pairCode}</Text>
        </View>
        <TouchableOpacity onPress={() => setShowProfileModal(true)}>
          <Text style={[styles.avatarSmall, { color: myAvatarColor }]}>
            {myNickname ? myNickname[0].toUpperCase() : userRole}
          </Text>
        </TouchableOpacity>
      </LinearGradient>

      {peaceActive && (
        <View style={styles.peaceBanner}>
          <Text style={{ color: colors.success, fontWeight: '700' }}>🤝 Мир заключён!</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Вы помирились. Так держать!</Text>
        </View>
      )}

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.moodSection}>
          <Text style={styles.sectionLabel}>Как вы себя чувствуете?</Text>
          <View style={styles.moodRow}>
            {MOOD_EMOJIS.map((mood, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.moodBtn, { opacity: (userRole === 'M' ? statusA : statusB) === mood.key ? 1 : 0.5 }]}
                onPress={() => updateStatus(mood.key)}
              >
                <Text style={styles.moodEmoji}>{mood.emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Вы</Text>
              <Text style={styles.statusEmoji}>
                {MOOD_EMOJIS.find(m => m.key === (userRole === 'M' ? statusA : statusB))?.emoji || '😐'}
              </Text>
            </View>
            <View style={styles.statusDivider} />
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Партнёр</Text>
              <Text style={styles.statusEmoji}>
                {MOOD_EMOJIS.find(m => m.key === (userRole === 'M' ? statusB : statusA))?.emoji || '😐'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.pulseSection}>
          <Animated.Text style={[styles.pulseHeart, { color: pulseScore > 70 ? colors.warning : colors.primary }]}>
            💓
          </Animated.Text>
          <Text style={styles.pulseScore}>({pulseScore}%)</Text>
          <Text style={styles.pulseHint}>Пульс вашей пары</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.bgCard }]}>
            <Text style={styles.statValue}>{daysTogether}</Text>
            <Text style={styles.statLabel}>Дней вместе</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.bgCard }]}>
            <Text style={styles.statValue}>{streak}</Text>
            <Text style={styles.statLabel}>Ритуалов</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.bgCard }]}>
            <Text style={styles.statValue}>{totalMessages}</Text>
            <Text style={styles.statLabel}>Сообщений</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💬 Чат</Text>
          <FlatList
            ref={chatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={[
                styles.msgBubble,
                item.user_id === userRole ? styles.msgMe : styles.msgPartner
              ]}>
                <Text style={styles.msgNickname}>
                  {item.nickname || item.user_id}
                </Text>
                <Text style={styles.msgText}>{item.text}</Text>
                <View style={styles.msgFooter}>
                  <Text style={styles.msgTime}>
                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  {item.user_id === userRole && <HeartStatus messageId={item.id} isRead={item.read_by_partner} />}
                </View>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.chatEmpty}>Начните общение 💬</Text>}
            style={styles.chatList}
          />
          {partnerTyping && <Text style={styles.typingText}>✍️ {partnerTyping} печатает...</Text>}
        </View>

        <View style={styles.chatInputRow}>
          <TextInput
            style={styles.chatInput}
            placeholder="Сообщение..."
            placeholderTextColor={colors.textMuted}
            value={chatInput}
            onChangeText={handleChatInput}
            onSubmitEditing={sendMessage}
            editable={!partnerSleeping}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={sendMessage} disabled={partnerSleeping}>
            <Text style={styles.sendText}>➤</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.sectionBtn} onPress={() => setShowMoodChart(!showMoodChart)}>
          <Text style={styles.sectionBtnText}>📊 История настроения</Text>
        </TouchableOpacity>

        {showMoodChart && moodHistory.length > 0 && (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>История: {moodHistory.length} записей</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✨ Вечерний ритуал</Text>
          <TextInput
            style={styles.textArea}
            placeholder="За что вы благодарны сегодня?"
            placeholderTextColor={colors.textMuted}
            value={ritualText}
            onChangeText={setRitualText}
            multiline
            editable={!partnerSleeping}
          />
          <TouchableOpacity style={styles.btnAction} onPress={completeRitual} disabled={partnerSleeping}>
            <Text style={styles.btnActionText}>Завершить ритуал</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Дневник</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Запишите ваши мысли..."
            placeholderTextColor={colors.textMuted}
            value={diaryText}
            onChangeText={setDiaryText}
            multiline
            editable={!partnerSleeping}
          />
          <TouchableOpacity style={styles.btnAction} onPress={addDiary} disabled={partnerSleeping}>
            <Text style={styles.btnActionText}>Добавить запись</Text>
          </TouchableOpacity>
          {diary.map((entry, i) => (
            <View key={i} style={styles.diaryItem}>
              <Text style={styles.diaryBy}>{entry.by === 'M' ? '👨' : '👩'} {new Date(entry.createdAt).toLocaleDateString()}</Text>
              <Text style={styles.diaryText}>{entry.text}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🤝 Отношения</Text>
          {!peaceActive && (
            <TouchableOpacity style={styles.btnAction} onPress={sendPeace}>
              <Text style={styles.btnActionText}>Отправить сигнал мира</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.btnAction, { backgroundColor: colors.warning, marginTop: 12 }]} onPress={toggleSleep}>
            <Text style={styles.btnActionText}>🌙 Режим сна</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btnAction, { backgroundColor: colors.textMuted, marginTop: 12 }]} onPress={logout}>
            <Text style={[styles.btnActionText, { color: colors.bg }]}>Выйти</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={showProfileModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Профиль</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ваш никнейм"
              placeholderTextColor={colors.textMuted}
              value={myNickname}
              onChangeText={setMyNickname}
              maxLength={20}
            />
            <Text style={styles.modalLabel}>Цвет аватара</Text>
            <View style={styles.colorRow}>
              {AVATAR_COLORS.map(color => (
                <TouchableOpacity
                  key={color}
                  style={[styles.colorBtn, { backgroundColor: color, borderColor: myAvatarColor === color ? '#fff' : 'transparent', borderWidth: 2 }]}
                  onPress={() => setMyAvatarColor(color)}
                />
              ))}
            </View>
            <TouchableOpacity style={styles.modalBtn} onPress={updateProfile}>
              <Text style={styles.modalBtnText}>Сохранить</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowProfileModal(false)}>
              <Text style={{ color: colors.textSecondary, marginTop: 12 }}>Отмена</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showSleepOverlay} transparent animationType="fade">
        <View style={styles.sleepOverlay}>
          <View style={styles.sleepCenter}>
            <Text style={styles.sleepIcon}>🌙</Text>
            <Text style={styles.sleepTitle}>Режим сна</Text>
            <Text style={styles.sleepSub}>Партнёр отдыхает. Чат заблокирован до утра.</Text>
            <TouchableOpacity style={styles.sleepCloseBtn} onPress={wakeUp}>
              <Text style={styles.sleepCloseText}>☀️ Я проснулся</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, backgroundColor: colors.bg },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  logo: { fontSize: 64, marginBottom: 12 },
  title: { fontSize: 32, fontWeight: '800', color: colors.text, marginBottom: 8 },
  subtitle: { fontSize: 16, color: colors.textSecondary, marginBottom: 40 },
  btns: { width: '100%', gap: 12 },
  btnMain: { backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  btnSec: { backgroundColor: colors.bgCard, paddingVertical: 16, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnTextSec: { color: colors.primary, fontSize: 16, fontWeight: '700' },
  back: { position: 'absolute', top: 16, left: 16, zIndex: 1 },
  backText: { color: colors.textSecondary, fontSize: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 16 },
  input: { width: '100%', backgroundColor: colors.bgCard, color: colors.text, padding: 16, borderRadius: 14, fontSize: 20, textAlign: 'center', letterSpacing: 3, marginBottom: 20, borderWidth: 1, borderColor: colors.border },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: colors.text },
  headerCode: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  avatarSmall: { fontSize: 16, fontWeight: '600', color: colors.accent },
  scroll: { flex: 1 },
  peaceBanner: { backgroundColor: colors.success + '20', padding: 12, borderRadius: 10, margin: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.success },
  moodSection: { backgroundColor: colors.bgCard, margin: 12, padding: 16, borderRadius: 16 },
  sectionLabel: { fontSize: 14, color: colors.textSecondary, marginBottom: 12 },
  moodRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  moodBtn: { padding: 8 },
  moodEmoji: { fontSize: 28 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statusItem: { alignItems: 'center' },
  statusLabel: { fontSize: 12, color: colors.textMuted, marginBottom: 6 },
  statusEmoji: { fontSize: 24 },
  statusDivider: { width: 1, backgroundColor: colors.border },
  pulseSection: { alignItems: 'center', padding: 20 },
  pulseHeart: { fontSize: 48 },
  pulseScore: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 8 },
  pulseHint: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 12, marginBottom: 12 },
  statCard: { borderRadius: 16, padding: 16, alignItems: 'center', flex: 1, marginHorizontal: 4 },
  statValue: { fontSize: 24, fontWeight: '800', color: colors.primary },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  section: { margin: 12 },
  sectionBtn: { backgroundColor: colors.bgCard, padding: 14, borderRadius: 12, marginHorizontal: 12, marginBottom: 12, alignItems: 'center' },
  sectionBtnText: { color: colors.text, fontWeight: '600' },
  chartContainer: { backgroundColor: colors.bgCard, marginHorizontal: 12, marginBottom: 12, padding: 16, borderRadius: 12 },
  chartTitle: { color: colors.text, fontSize: 14 },
  msgBubble: { maxWidth: '80%', padding: 12, borderRadius: 16, marginBottom: 8 },
  msgMe: { alignSelf: 'flex-end', backgroundColor: colors.msgMe },
  msgPartner: { alignSelf: 'flex-start', backgroundColor: colors.msgPartner },
  msgNickname: { fontSize: 12, color: colors.textSecondary, marginBottom: 4, fontWeight: '600' },
  msgText: { fontSize: 15, color: '#fff', marginBottom: 6 },
  msgFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  msgTime: { fontSize: 11, color: 'rgba(255,255,255,0.6)' },
  msgHeart: { fontSize: 14, marginLeft: 6 },
  chatList: { maxHeight: 300 },
  chatEmpty: { textAlign: 'center', color: colors.textMuted, padding: 20 },
  typingText: { fontSize: 12, color: colors.textSecondary, paddingHorizontal: 16, marginBottom: 8 },
  chatInputRow: { flexDirection: 'row', padding: 12, borderTopWidth: 1, borderColor: colors.border, backgroundColor: colors.bg },
  chatInput: { flex: 1, backgroundColor: colors.bgCard, color: colors.text, padding: 12, borderRadius: 20, marginRight: 8 },
  sendBtn: { backgroundColor: colors.primary, width: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  sendText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  textArea: { backgroundColor: colors.bgCard, color: colors.text, padding: 14, borderRadius: 12, fontSize: 15, minHeight: 80, marginBottom: 14, borderWidth: 1, borderColor: colors.border },
  btnAction: { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnActionText: { color: '#fff', fontWeight: '700' },
  diaryItem: { marginTop: 12, padding: 12, backgroundColor: colors.bgCard, borderRadius: 10 },
  diaryBy: { fontSize: 12, color: colors.textSecondary, marginBottom: 6 },
  diaryText: { fontSize: 14, color: colors.text },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: colors.bgCard, padding: 24, borderRadius: 20, width: '85%', alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 20 },
  modalInput: { width: '100%', backgroundColor: colors.bg, color: colors.text, padding: 12, borderRadius: 10, marginBottom: 16 },
  modalLabel: { fontSize: 14, color: colors.textSecondary, marginBottom: 8, alignSelf: 'flex-start' },
  colorRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  colorBtn: { width: 36, height: 36, borderRadius: 18 },
  modalBtn: { backgroundColor: colors.primary, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 10 },
  modalBtnText: { color: '#fff', fontWeight: '700' },
  sleepOverlay: { flex: 1, backgroundColor: colors.sleepOverlay, justifyContent: 'center', alignItems: 'center' },
  sleepCenter: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: 30, borderRadius: 24, borderWidth: 1, borderColor: colors.accent + '40' },
  sleepIcon: { fontSize: 64, marginBottom: 12 },
  sleepTitle: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 8 },
  sleepSub: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', maxWidth: 260, marginBottom: 24 },
  sleepCloseBtn: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  sleepCloseText: { color: '#fff', fontWeight: '700' }
});