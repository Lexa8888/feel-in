import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  SafeAreaView, Alert, Animated, Platform, Modal,
  KeyboardAvoidingView, FlatList
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';
import { createClient } from '@supabase/supabase-js';

// 🔐 CONFIG
const CONFIG = {
  SUPABASE_URL: 'https://lslsvzpraiobchxvncdo.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_r8KH-Zuqv-j5mS4DDjDQZw_RtG81TcK',
  SERVER_URL: 'https://feel-in.onrender.com'
};

const IS_WEB = Platform.OS === 'web';
const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

// 🎨 COLORS
const COLORS = {
  bg: '#0f0f1e', card: '#1a1a2e', primary: '#ff6b9d', secondary: '#6b72ff',
  text: '#ffffff', textMuted: '#a0a0b0', border: '#2a2a45'
};

export default function App() {
  const [screen, setScreen] = useState('welcome');
  const [pairCode, setPairCode] = useState('');
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(false);
  const [genderModalVisible, setGenderModalVisible] = useState(false);
  const [pendingCode, setPendingCode] = useState('');
  
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [statusA, setStatusA] = useState(null);
  const [statusB, setStatusB] = useState(null);
  const [quiz, setQuiz] = useState({ ans_a: null, ans_b: null, revealed: false });
  const [partnerSleeping, setPartnerSleeping] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const socketRef = useRef(null);

  // 🚀 INIT
  useEffect(() => {
    loadSession();
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: !IS_WEB }).start();
    return () => { if (socketRef.current) socketRef.current.disconnect(); };
  }, []);

  // 📦 LOAD SESSION
  const loadSession = async () => {
    try {
      const data = await AsyncStorage.getItem('feel_in_session');
      if (data) {
        const { code, role } = JSON.parse(data);
        if (code && role) {
          setPairCode(code);
          setUserRole(role);
          setScreen('main');
          connectSocket(code, role);
        }
      }
    } catch (e) { console.log('Session load error', e); }
  };

  // 🔌 CONNECT SOCKET
  const connectSocket = (code, role) => {
    if (socketRef.current) socketRef.current.disconnect();
    
    const newSocket = io(CONFIG.SERVER_URL, {
      transports: ['websocket'],
      query: { pairCode: code, userRole: role }
    });
    socketRef.current = newSocket;

    newSocket.emit('join-pair', { pairCode: code, userRole: role });
    newSocket.emit('load-messages', { pairCode: code });

    newSocket.on('init-data', (data) => {
      setStatusA(data.statusA);
      setStatusB(data.statusB);
      setQuiz(data.quiz);
      setPartnerSleeping(data.sleep_mode);
    });

    newSocket.on('messages-loaded', (msgs) => {
      setMessages(msgs || []);
      AsyncStorage.setItem(`msgs_${code}`, JSON.stringify(msgs || []));
    });

    newSocket.on('new-message', (msg) => {
      setMessages(prev => [...prev, msg]);
      if (!IS_WEB) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    });

    newSocket.on('status-updated', (data) => {
      if (data.field === 'status_a') setStatusA(data.mood);
      else setStatusB(data.mood);
    });

    newSocket.on('quiz-updated', (updatedQuiz) => {
      setQuiz(updatedQuiz);
    });

    newSocket.on('sleep-updated', (data) => {
      if (data.userId !== userRole) {
        setPartnerSleeping(data.active);
      }
    });
  };

  // ✨ CREATE PAIR
  const handleCreatePair = async () => {
    setLoading(true);
    try {
      const code = 'FEEL-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      setPendingCode(code);
      setGenderModalVisible(true); // ✅ ПОКАЗЫВАЕМ МОДАЛКУ
      if (!IS_WEB) Haptics.selectionAsync();
    } catch (e) {
      Alert.alert('Ошибка', 'Не удалось создать пару');
    } finally {
      setLoading(false);
    }
  };

  // 👤 SELECT GENDER - ✅ ИСПРАВЛЕНО
  const handleGenderSelect = async (gender) => {
    const code = pendingCode.replace('FEEL-', '');
    const role = gender;
    const opposite = gender === 'M' ? 'Ж' : 'M';
    
    console.log('🔵 Creating pair:', code, 'with role:', role);
    
    try {
      // ✅ СОХРАНЯЕМ В БД
      const { data, error } = await supabase
        .from('pairs')
        .insert([{ 
          code: code,
          gender_a: role,
          gender_b: opposite,
          status_a: '😊',
          status_b: '😊',
          quiz: { ans_a: null, ans_b: null, revealed: false },
          sleep_mode: false
        }])
        .select()
        .single();
        
      if (error) {
        console.error('❌ DB Error:', error);
        Alert.alert('Ошибка БД', error.message);
        return;
      }
      
      console.log('✅ Pair created:', data);
      
      // ✅ ЗАКРЫВАЕМ МОДАЛКУ
      setGenderModalVisible(false);
      
      // ✅ УСТАНАВЛИВАЕМ РОЛЬ И КОД
      setUserRole(role);
      setPairCode('FEEL-' + code);
      
      // ✅ СОХРАНЯЕМ СЕССИЮ
      await AsyncStorage.setItem('feel_in_session', JSON.stringify({ 
        code: 'FEEL-' + code, 
        role: role 
      }));
      
      // ✅ ПЕРЕХОДИМ НА ГЛАВНЫЙ ЭКРАН
      setScreen('main');
      
      // ✅ ПОДКЛЮЧАЕМ СОКЕТ
      connectSocket('FEEL-' + code, role);
      
      if (!IS_WEB) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
    } catch (e) {
      console.error('❌ Gender select error:', e);
      Alert.alert('Ошибка', e.message);
    }
  };

  // 🔑 JOIN PAIR
  const handleJoinPair = async () => {
    if (!pairCode.trim()) return Alert.alert('Ошибка', 'Введите код');
    setLoading(true);
    
    try {
      const cleanCode = pairCode.trim().toUpperCase().replace('FEEL-', '');
      
      const { data: pair, error } = await supabase
        .from('pairs')
        .select('*')
        .eq('code', cleanCode)
        .single();
        
      if (error || !pair) {
        Alert.alert('Ошибка', 'Пара не найдена');
        return;
      }
      
      // ✅ АВТОМАТИЧЕСКИ НАЗНАЧАЕМ ПРОТИВОПОЛОЖНЫЙ ПОЛ
      const myRole = pair.gender_a === 'M' ? 'Ж' : 'M';
      
      setUserRole(myRole);
      setPairCode('FEEL-' + cleanCode);
      setScreen('main');
      
      await AsyncStorage.setItem('feel_in_session', JSON.stringify({ 
        code: 'FEEL-' + cleanCode, 
        role: myRole 
      }));
      
      connectSocket('FEEL-' + cleanCode, myRole);
      
      if (!IS_WEB) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
    } catch (e) {
      Alert.alert('Ошибка', 'Не удалось подключиться');
    } finally {
      setLoading(false);
    }
  };

  // 💬 SEND MESSAGE
  const sendMessage = () => {
    if (!inputText.trim() || !socketRef.current) return;
    
    const tempId = Date.now().toString();
    const tempMsg = { 
      id: tempId, 
      text: inputText, 
      user_id: userRole, 
      created_at: new Date().toISOString() 
    };
    
    setMessages(prev => [...prev, tempMsg]);
    setInputText('');
    
    socketRef.current.emit('send-message', {
      pairCode, userId: userRole, text: tempMsg.text, tempId
    });
    
    if (!IS_WEB) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  // 💓 UPDATE MOOD
  const updateMood = (emoji) => {
    if (!socketRef.current) return;
    socketRef.current.emit('update-status', { pairCode, userId: userRole, mood: emoji });
    if (!IS_WEB) Haptics.selectionAsync();
  };

  // ❓ SUBMIT QUIZ
  const submitQuiz = (answer) => {
    if (!socketRef.current) return;
    socketRef.current.emit('quiz-submit', { pairCode, userId: userRole, answer });
    if (!IS_WEB) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // 😴 TOGGLE SLEEP
  const toggleSleep = () => {
    if (!socketRef.current) return;
    const newState = !partnerSleeping;
    socketRef.current.emit('sleep-toggle', { pairCode, userId: userRole, active: newState });
  };

  // 🎨 RENDER WELCOME
  const renderWelcome = () => (
    <Animated.View style={[styles.center, { opacity: fadeAnim }]}>
      {/* ✅ УБРАНЫ ЧЕЛОВЕЧКИ - ТОЛЬКО СЕРДЕЧКО */}
      <Text style={styles.title}>Feel In 💑</Text>
      <Text style={styles.subtitle}>Пространство для двоих</Text>
      
      <View style={styles.btnContainer}>
        <TouchableOpacity 
          style={[styles.btn, styles.btnPrimary]} 
          onPress={handleCreatePair} 
          disabled={loading}
        >
          <Text style={styles.btnText}>{loading ? '...' : '✨ Создать пару'}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.btn, styles.btnSecondary]} 
          onPress={() => setScreen('join')}
        >
          <Text style={[styles.btnText, { color: COLORS.primary }]}>🔑 Войти по коду</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  // 🎨 RENDER JOIN
  const renderJoin = () => (
    <View style={styles.center}>
      <Text style={styles.title}>Вход</Text>
      <TextInput 
        style={styles.input}
        placeholder="FEEL-XXXX"
        placeholderTextColor={COLORS.textMuted}
        value={pairCode}
        onChangeText={setPairCode}
        autoCapitalize="characters"
        maxLength={12}
      />
      <TouchableOpacity 
        style={[styles.btn, styles.btnPrimary]} 
        onPress={handleJoinPair} 
        disabled={loading}
      >
        <Text style={styles.btnText}>{loading ? '...' : 'Войти'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setScreen('welcome')} style={{marginTop: 20}}>
        <Text style={{color: COLORS.textMuted}}>← Назад</Text>
      </TouchableOpacity>
    </View>
  );

  // 🎨 RENDER MAIN
  const renderMain = () => (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{pairCode}</Text>
        <TouchableOpacity onPress={toggleSleep}>
          <Text style={{fontSize: 24}}>{partnerSleeping ? '🌙' : '☀️'}</Text>
        </TouchableOpacity>
      </View>

      {partnerSleeping && (
        <View style={styles.sleepOverlay}>
          <Text style={{fontSize: 40, marginBottom: 10}}>🌙</Text>
          <Text style={styles.sleepText}>Партнёр спит</Text>
          <Text style={{color: COLORS.textMuted}}>Чат заблокирован</Text>
        </View>
      )}

      <View style={styles.moodRow}>
        {['😊', '😍', '🤗', '😢', '😤'].map(mood => (
          <TouchableOpacity key={mood} onPress={() => updateMood(mood)} style={styles.moodBtn}>
            <Text style={{fontSize: 24}}>{mood}</Text>
          </TouchableOpacity>
        ))}
      </View>
      
      <View style={styles.statusRow}>
        <Text style={{color: COLORS.text}}>Вы: {userRole === 'M' ? statusA : statusB || ''}</Text>
        <Text style={{color: COLORS.text}}>Партнёр: {userRole === 'M' ? statusB : statusA || '😐'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Вопрос дня</Text>
        {!quiz.revealed ? (
          <View style={styles.quizOptions}>
            <TouchableOpacity style={styles.quizBtn} onPress={() => submitQuiz('Да')}>
              <Text style={styles.quizText}>Да</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quizBtn} onPress={() => submitQuiz('Нет')}>
              <Text style={styles.quizText}>Нет</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.quizResult}>
            <Text style={{color: COLORS.primary, fontWeight: 'bold'}}>Ответы раскрыты!</Text>
            <Text style={{color: COLORS.text}}>М: {quiz.ans_a} | Ж: {quiz.ans_b}</Text>
          </View>
        )}
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[
            styles.msgBubble, 
            item.user_id === userRole ? styles.msgMe : styles.msgPartner
          ]}>
            <Text style={{color: '#fff'}}>{item.text}</Text>
          </View>
        )}
        style={styles.chatList}
      />

      <KeyboardAvoidingView behavior={IS_WEB ? 'height' : 'padding'}>
        <View style={styles.inputRow}>
          <TextInput 
            style={styles.chatInput}
            placeholder="Сообщение..."
            placeholderTextColor={COLORS.textMuted}
            value={inputText}
            onChangeText={setInputText}
            editable={!partnerSleeping}
          />
          <TouchableOpacity 
            style={styles.sendBtn} 
            onPress={sendMessage}
            disabled={partnerSleeping}
          >
            <Text style={{color: '#fff', fontWeight: 'bold'}}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  return (
    <View style={{flex: 1, backgroundColor: COLORS.bg}}>
      {screen === 'welcome' && renderWelcome()}
      {screen === 'join' && renderJoin()}
      {screen === 'main' && renderMain()}
      
      {/* ✅ МОДАЛКА ВЫБОРА ПОЛА */}
      <Modal 
        visible={genderModalVisible} 
        transparent 
        animationType="fade"
        onRequestClose={() => setGenderModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Выберите ваш пол</Text>
            <TouchableOpacity 
              style={styles.genderBtn} 
              onPress={() => handleGenderSelect('M')}
            >
              <Text style={styles.genderBtnText}>👨 Мужской</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.genderBtn} 
              onPress={() => handleGenderSelect('Ж')}
            >
              <Text style={styles.genderBtnText}>👩 Женский</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// 🎨 STYLES
const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 32, fontWeight: 'bold', color: COLORS.text, marginBottom: 10 },
  subtitle: { fontSize: 16, color: COLORS.textMuted, marginBottom: 40 },
  btnContainer: { width: '100%', gap: 15 },
  btn: { width: '100%', padding: 15, borderRadius: 12, alignItems: 'center' },
  btnPrimary: { backgroundColor: COLORS.primary },
  btnSecondary: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.primary },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  input: { width: '100%', backgroundColor: COLORS.card, color: COLORS.text, padding: 15, borderRadius: 12, marginBottom: 20, textAlign: 'center', fontSize: 20 },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderColor: COLORS.border },
  headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  
  moodRow: { flexDirection: 'row', justifyContent: 'space-around', padding: 15, backgroundColor: COLORS.card, margin: 10, borderRadius: 12 },
  moodBtn: { padding: 10 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  
  card: { backgroundColor: COLORS.card, margin: 10, padding: 15, borderRadius: 12 },
  cardTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  quizOptions: { flexDirection: 'row', gap: 10 },
  quizBtn: { flex: 1, backgroundColor: COLORS.secondary, padding: 10, borderRadius: 8, alignItems: 'center' },
  quizText: { color: '#fff', fontWeight: 'bold' },
  quizResult: { alignItems: 'center' },
  
  chatList: { flex: 1, padding: 10 },
  msgBubble: { maxWidth: '80%', padding: 10, borderRadius: 12, marginBottom: 5 },
  msgMe: { alignSelf: 'flex-end', backgroundColor: COLORS.primary },
  msgPartner: { alignSelf: 'flex-start', backgroundColor: COLORS.secondary },
  
  inputRow: { flexDirection: 'row', padding: 10, borderTopWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bg },
  chatInput: { flex: 1, backgroundColor: COLORS.card, color: COLORS.text, borderRadius: 20, paddingHorizontal: 15, marginRight: 10 },
  sendBtn: { width: 40, height: 40, backgroundColor: COLORS.primary, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  
  sleepOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  sleepText: { fontSize: 24, color: COLORS.text, fontWeight: 'bold', marginBottom: 10 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: COLORS.card, padding: 30, borderRadius: 20, width: '80%', alignItems: 'center' },
  modalTitle: { color: COLORS.text, fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  genderBtn: { width: '100%', padding: 15, backgroundColor: COLORS.secondary, borderRadius: 10, marginBottom: 10, alignItems: 'center' },
  genderBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});