import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Alert, Platform, StatusBar, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';
import { createClient } from '@supabase/supabase-js';

const CONFIG = {
  SUPABASE_URL: 'https://jgpcuebyysxkrdqkvqmz.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_xQWX7_juECMQlPzwW-cb9w_CLszetYD',
  SERVER_URL: 'https://feel-in.onrender.com'
};

const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

export default function App() {
  const [screen, setScreen] = useState('welcome');
  const [pairCode, setPairCode] = useState('');
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [myMood, setMyMood] = useState(null);
  const [partnerMood, setPartnerMood] = useState(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  const MOODS = [
    { emoji: '😊', key: 'happy' }, { emoji: '😌', key: 'calm' }, { emoji: '😍', key: 'love' },
    { emoji: '🤗', key: 'hug' }, { emoji: '😔', key: 'sad' }, { emoji: '😤', key: 'angry' }
  ];

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    loadSession();
    return () => { if (socketRef.current) socketRef.current.disconnect(); };
  }, []);

  const loadSession = async () => {
    try {
      const saved = await AsyncStorage.getItem('feel_session');
      if (saved) {
        const { code, role } = JSON.parse(saved);
        if (code && role) {
          setPairCode(code);
          setUserRole(role);
          setScreen('main');
          initSocket(code, role);
        }
      }
    } catch (e) { console.log('No session'); }
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
    
    newSocket.on('connect', () => {
      console.log('✅ Socket connected');
      setConnected(true);
      newSocket.emit('join-pair', { pairCode: code.replace('FEEL-', ''), userRole: role });
    });

    newSocket.on('joined', () => {
      console.log('✅ Joined room');
      newSocket.emit('load-messages', { pairCode: code.replace('FEEL-', '') });
    });
    
    newSocket.on('new-message', (msg) => {
      setMessages(prev => [...prev.filter(m => m.id !== msg.id), msg]);
    });
    
    newSocket.on('messages-loaded', (msgs) => setMessages(msgs || []));
    
    newSocket.on('init-status', ({ statusA, statusB }) => {
      if (role === 'M') { setMyMood(statusA); setPartnerMood(statusB); }
      else { setMyMood(statusB); setPartnerMood(statusA); }
    });

    newSocket.on('status-updated', (data) => {
      if (data.user === role) setMyMood(data.value);
      else setPartnerMood(data.value);
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
      const { error } = await supabase.from('pairs').insert({ code, gender_a: 'M', gender_b: 'Ж', status_a: null, status_b: null });
      if (error) throw error;
      
      const fullCode = 'FEEL-' + code;
      await AsyncStorage.setItem('feel_session', JSON.stringify({ code: fullCode, role: 'M' }));
      setPairCode(fullCode);
      setUserRole('M');
      setScreen('main');
      initSocket(fullCode, 'M');
    } catch (e) { Alert.alert('Ошибка', e.message); }
    finally { setLoading(false); }
  };

  const joinPair = async () => {
    const raw = pairCode.trim().toUpperCase();
    if (!raw) { Alert.alert('Ошибка', 'Введите код'); return; }
    
    const cleanCode = raw.replace('FEEL-', '');
    const fullCode = 'FEEL-' + cleanCode;
    
    try {
      setLoading(true);
      console.log('🔍 Searching for code:', cleanCode);
      
      const {  pair, error } = await supabase
        .from('pairs')
        .select('*')
        .eq('code', cleanCode)
        .single();
      
      console.log('📡 Response:', { pair, error });
      
      // ПРОВЕРКА: если пары нет
      if (!pair) {
        Alert.alert('Ошибка входа', `Пара с кодом "${cleanCode}" не найдена.\n\nПроверьте правильность ввода кода.`);
        setLoading(false);
        return;
      }
      
      console.log('✅ Pair found! Joining...');
      await AsyncStorage.setItem('feel_session', JSON.stringify({ code: fullCode, role: 'Ж' }));
      setPairCode(fullCode);
      setUserRole('Ж');
      setScreen('main');
      setTimeout(() => initSocket(fullCode, 'Ж'), 100);
      
    } catch (e) { 
      console.error('❌ Error:', e);
      Alert.alert('Ошибка', e.message); 
    } finally { 
      setLoading(false); 
    }
  };

  const sendMessage = () => {
    if (!chatInput.trim() || !socketRef.current) return;
    const msg = { id: Date.now().toString(), pair_code: pairCode.replace('FEEL-', ''), user_id: userRole, text: chatInput.trim(), created_at: new Date().toISOString() };
    socketRef.current.emit('send-message', msg);
    setMessages(prev => [...prev, msg]);
    setChatInput('');
  };

  const updateMood = (key) => {
    if (!socketRef.current) return;
    setMyMood(key);
    socketRef.current.emit('update-status', { code: pairCode.replace('FEEL-', ''), user: userRole, value: key });
  };

  const logout = async () => {
    if (socketRef.current) socketRef.current.disconnect();
    await AsyncStorage.removeItem('feel_session');
    setScreen('welcome'); setPairCode(''); setUserRole(null); setMessages([]);
  };

  if (screen === 'welcome') {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.logo}>💕</Text>
          <Text style={styles.title}>Feel In</Text>
          <Text style={styles.subtitle}>Пространство для двоих</Text>
          <TextInput style={styles.input} placeholder="Введите код (FEEL-XXXX)" placeholderTextColor="#a0a0b0" value={pairCode} onChangeText={setPairCode} autoCapitalize="characters" editable={!loading} />
          <TouchableOpacity style={styles.button} onPress={joinPair} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>🔑 Войти по коду</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={createPair} disabled={loading}>
            {loading ? <ActivityIndicator color="#ff6b9d" /> : <Text style={[styles.buttonText, { color: '#ff6b9d' }]}>✨ Создать пару</Text>}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#ff6b9d', '#6b72ff']} style={styles.header}>
        <View><Text style={styles.headerTitle}>Feel In</Text><Text style={styles.headerCode}>{pairCode}</Text></View>
        <View style={styles.status}><View style={[styles.dot, { backgroundColor: connected ? '#4ade80' : '#ef4444' }]} /><Text style={styles.statusText}>{connected ? 'Онлайн' : 'Офлайн'}</Text></View>
      </LinearGradient>
      <View style={styles.statusBar}>
        <View style={styles.statusItem}><Text style={styles.statusLabel}>Вы</Text><Text style={styles.mood}>{MOODS.find(m => m.key === myMood)?.emoji || '😐'}</Text></View>
        <View style={styles.divider} />
        <View style={styles.statusItem}><Text style={styles.statusLabel}>Партнёр</Text><Text style={styles.mood}>{MOODS.find(m => m.key === partnerMood)?.emoji || '😐'}</Text></View>
      </View>
      <View style={styles.moodSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {MOODS.map(mood => (
            <TouchableOpacity key={mood.key} style={[styles.moodBtn, myMood === mood.key && { backgroundColor: '#ff6b9d' }]} onPress={() => updateMood(mood.key)}>
              <Text style={styles.moodEmoji}>{mood.emoji}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <View style={styles.chat}>
        <ScrollView style={styles.messages} contentContainerStyle={{ paddingBottom: 12 }}>
          {messages.map(msg => (<View key={msg.id} style={[styles.msg, msg.user_id === userRole ? styles.msgMe : styles.msgPartner]}><Text style={styles.msgText}>{msg.text}</Text></View>))}
          {messages.length === 0 && <Text style={styles.empty}>Начните общение 💬</Text>}
        </ScrollView>
        <View style={styles.inputRow}>
          <TextInput style={styles.chatInput} placeholder="Сообщение..." placeholderTextColor="#a0a0b0" value={chatInput} onChangeText={setChatInput} onSubmitEditing={sendMessage} />
          <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}><Text style={styles.sendText}>➤</Text></TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity style={styles.logoutBtn} onPress={logout}><Text style={styles.logoutText}>🚪 Выйти</Text></TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1e' }, center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  logo: { fontSize: 80, marginBottom: 20 }, title: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 8 }, subtitle: { fontSize: 16, color: '#a0a0b0', marginBottom: 40 },
  input: { width: '100%', backgroundColor: '#1a1a2e', color: '#fff', padding: 16, borderRadius: 12, fontSize: 18, textAlign: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#2a2a45' },
  button: { width: '100%', backgroundColor: '#ff6b9d', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  buttonSecondary: { backgroundColor: '#1a1a2e', borderWidth: 1, borderColor: '#ff6b9d' }, buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' }, headerCode: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  status: { flexDirection: 'row', alignItems: 'center' }, dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 }, statusText: { color: '#fff', fontSize: 12 },
  statusBar: { flexDirection: 'row', backgroundColor: '#1a1a2e', margin: 12, padding: 16, borderRadius: 12 },
  statusItem: { flex: 1, alignItems: 'center' }, statusLabel: { fontSize: 12, color: '#a0a0b0', marginBottom: 8 }, mood: { fontSize: 32 }, divider: { width: 1, backgroundColor: '#2a2a45' },
  moodSection: { backgroundColor: '#1a1a2e', margin: 12, padding: 12, borderRadius: 12 },
  moodBtn: { padding: 10, marginHorizontal: 4, borderRadius: 8, backgroundColor: '#0f0f1e' }, moodEmoji: { fontSize: 24 },
  chat: { flex: 1, margin: 12 }, messages: { flex: 1 }, empty: { textAlign: 'center', color: '#a0a0b0', padding: 40, fontSize: 16 },
  msg: { maxWidth: '80%', padding: 12, borderRadius: 12, marginBottom: 8 },
  msgMe: { alignSelf: 'flex-end', backgroundColor: '#ff6b9d' }, msgPartner: { alignSelf: 'flex-start', backgroundColor: '#1a1a2e' },
  msgText: { color: '#fff', fontSize: 15 },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  chatInput: { flex: 1, backgroundColor: '#1a1a2e', color: '#fff', padding: 12, borderRadius: 20, marginRight: 8 },
  sendBtn: { width: 44, height: 44, backgroundColor: '#ff6b9d', borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  sendText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  logoutBtn: { backgroundColor: '#1a1a2e', padding: 12, margin: 12, borderRadius: 8, alignItems: 'center' }, logoutText: { color: '#fff', fontSize: 14 }
});