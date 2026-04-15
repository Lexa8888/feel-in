import { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, Keyboard 
} from 'react-native';
import io from 'socket.io-client';
import axios from 'axios';

// ✅ URL облачного сервера
const SERVER_URL = 'https://feel-in.onrender.com';

// 🎨 Цветовая палитра
const COLORS = {
  bg: '#0F0F1A',
  card: 'rgba(255,255,255,0.08)',
  cardBorder: 'rgba(255,255,255,0.15)',
  primary: '#FF6B6B',
  secondary: '#4ECDC4',
  accent: '#FFE66D',
  text: '#FFFFFF',
  textDim: '#A0A0B0',
  success: '#4CAF50',
  warning: '#FFB347',
};

export default function App() {
  const [screen, setScreen] = useState('pairing');
  const [pairCode, setPairCode] = useState('');
  const [userId, setUserId] = useState('M');
  const [data, setData] = useState(null);
  const [socket, setSocket] = useState(null);
  const [diaryText, setDiaryText] = useState('');
  const [loading, setLoading] = useState(false);

  // Подключение к серверу
  useEffect(() => {
    const newSocket = io(SERVER_URL);
    setSocket(newSocket);
    return () => newSocket.disconnect();
  }, []);

  // Слушаем обновления от сервера
  useEffect(() => {
    if (!socket) return;
    const events = ['status-updated', 'ritual-updated', 'diary-updated', 'peace-updated', 'quiz-updated'];
    const handlers = events.map(evt => {
      const handler = (newData) => {
        console.log('Получено обновление:', evt, newData);
        setData(newData);
      };
      socket.on(evt, handler);
      return { evt, handler };
    });
    return () => handlers.forEach(({ evt, handler }) => socket.off(evt, handler));
  }, [socket]);

  const createPair = async () => {
    try {
      setLoading(true);
      console.log('Создание пары...');
      const res = await axios.post(`${SERVER_URL}/api/pair/create`);
      setPairCode(res.data.code);
      Alert.alert('✨ Пара создана', `Твой код: ${res.data.code}\nСкопируй и отправь партнёру`, [{ text: 'Круто!' }]);
    } catch (e) { 
      console.error('Ошибка создания пары:', e);
      Alert.alert('Ошибка', 'Проверь подключение к интернету'); 
    } finally {
      setLoading(false);
    }
  };

  const joinPair = async () => {
    if (!pairCode.trim()) {
      Alert.alert('Внимание', 'Введи код партнёра');
      return;
    }
    try {
      setLoading(true);
      console.log('Вход в пару:', pairCode, userId);
      const res = await axios.post(`${SERVER_URL}/api/pair/join`, { code: pairCode, userId });
      setData(res.data.pair);
      socket.emit('join-pair', res.data.pairId);
      setScreen('home');
    } catch (e) { 
      console.error('Ошибка входа:', e);
      Alert.alert('Ошибка', e.response?.data?.error || 'Код неверный'); 
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = (val) => {
    console.log('Обновление статуса:', val);
    socket?.emit('update-status', { code: data?.id, user: userId, value: val });
  };

  const completeRitual = () => {
    console.log('Ритуал выполнен');
    socket?.emit('complete-ritual', { code: data?.id });
    Alert.alert('🎉 Отлично!', 'Ритуал выполнен! Ваш streak растёт 🔥', [{ text: 'Ура!' }]);
  };

  const addDiary = () => {
    if (!diaryText.trim()) return;
    console.log('Запись в дневник:', diaryText);
    socket?.emit('add-diary', { code: data?.id, user: userId, text: diaryText });
    setDiaryText('');
    Keyboard.dismiss();
  };

  const sendPeace = () => {
    console.log('Сигнал мира');
    socket?.emit('peace-request', { code: data?.id, user: userId });
    Alert.alert('🕊️ Сигнал отправлен', 'Партнёр получит уведомление', [{ text: 'Хорошо' }]);
  };

  const submitQuiz = (ans) => {
    console.log('Ответ на викторину:', ans);
    socket?.emit('quiz-submit', { code: data?.id, user: userId, ans });
  };

  // === ЭКРАН СОЗДАНИЯ ПАРЫ ===
  if (screen === 'pairing') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.logo}>Feel in</Text>
          <Text style={styles.subtitle}>Чувствуйте друг друга 💫</Text>
        </View>

        <View style={styles.card}>
          <TouchableOpacity 
            style={[styles.btnPrimary, loading && styles.btnDisabled]} 
            onPress={createPair}
            disabled={loading}
          >
            <Text style={styles.btnText}>{loading ? 'Загрузка...' : '✨ Создать пару'}</Text>
          </TouchableOpacity>
          
          <Text style={styles.divider}>или присоединиться</Text>
          
          <TextInput 
            placeholder="Код партнёра (напр. FEEL-ABCD)" 
            value={pairCode} 
            onChangeText={setPairCode} 
            style={styles.input} 
            placeholderTextColor={COLORS.textDim}
            autoCapitalize="characters"
          />
          
          <View style={styles.roleSelector}>
            <TouchableOpacity 
              style={[styles.roleBtn, userId === 'M' && styles.roleBtnActive]} 
              onPress={() => setUserId('M')}
            >
              <Text style={[styles.roleText, userId === 'M' && styles.roleTextActive]}>Партнёр М</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.roleBtn, userId === 'Ж' && styles.roleBtnActive]} 
              onPress={() => setUserId('Ж')}
            >
              <Text style={[styles.roleText, userId === 'Ж' && styles.roleTextActive]}>Партнёр Ж</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={[styles.btnSecondary, { marginTop: 15 }, loading && styles.btnDisabled]} 
            onPress={joinPair}
            disabled={loading}
          >
            <Text style={styles.btnText}>{loading ? 'Загрузка...' : '🚀 Войти в пару'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>💙 Feel in — пространство для ваших отношений</Text>
      </View>
    );
  }

  // === ГЛАВНЫЙ ЭКРАН ===
  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      
      {/* 🔋 СТАТУС НАСТРОЕНИЯ */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔋 Состояние сегодня</Text>
        <View style={styles.statusGrid}>
          {[
            { emoji: '🔴', label: 'Тяжело', value: '🔴' },
            { emoji: '🟡', label: 'Нормально', value: '🟡' },
            { emoji: '🟢', label: 'Хорошо', value: '🟢' },
            { emoji: '⚡', label: 'Отлично', value: '⚡' },
          ].map((item) => (
            <TouchableOpacity 
              key={item.value} 
              style={styles.statusBtn}
              onPress={() => updateStatus(item.value)}
            >
              <Text style={styles.statusEmoji}>{item.emoji}</Text>
              <Text style={styles.statusLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.statusHint}>
          Моё: <Text style={{ color: COLORS.primary }}>{userId === 'M' ? data?.statusM : data?.statusЖ}</Text> 
          {' • '}
          Партнёр: <Text style={{ color: COLORS.secondary }}>{userId === 'M' ? data?.statusЖ : data?.statusM}</Text>
        </Text>
      </View>

      {/* ❤️ РИТУАЛ ДНЯ */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>❤️ Ритуал дня</Text>
        <View style={styles.card}>
          <Text style={styles.cardText}>Напиши 1 комплимент или «спасибо» партнёру</Text>
          <TouchableOpacity style={styles.btnPrimary} onPress={completeRitual}>
            <Text style={styles.btnText}>✓ Выполнено</Text>
          </TouchableOpacity>
          <View style={styles.streakBadge}>
            <Text style={styles.streakText}>🔥 Streak: {data?.streak || 0} дней</Text>
          </View>
        </View>
      </View>

      {/* 🤝 КНОПКА "МИР" */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🤝 Кнопка "Мир"</Text>
        <TouchableOpacity 
          style={[styles.btnPeace, data?.peace?.active && styles.btnPeaceActive]} 
          onPress={sendPeace}
        >
          <Text style={styles.btnText}>
            {data?.peace?.active && data?.peace?.from === userId ? '⏳ Ожидание...' : '🕊️ Отправить сигнал мира'}
          </Text>
        </TouchableOpacity>
        {data?.peace?.active && data?.peace?.from !== userId && (
          <View style={styles.peaceNotification}>
            <Text style={styles.peaceText}>✨ Партнёр хочет помириться</Text>
            <Text style={styles.peaceSubtext}>Нажмите, чтобы принять</Text>
          </View>
        )}
      </View>

      {/* 📝 ДНЕВНИК */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📝 Дневник благодарности</Text>
        <TextInput 
          placeholder="За что благодарен(на) сегодня?" 
          value={diaryText} 
          onChangeText={setDiaryText} 
          style={styles.input} 
          placeholderTextColor={COLORS.textDim}
          multiline
        />
        <TouchableOpacity style={styles.btnSecondary} onPress={addDiary}>
          <Text style={styles.btnText}>💫 Добавить запись</Text>
        </TouchableOpacity>
        
        <View style={styles.diaryList}>
          {data?.diary?.slice().reverse().slice(0, 5).map((d, i) => (
            <View key={d.id || i} style={styles.diaryItem}>
              <Text style={styles.diaryBy}>{d.by === userId ? 'Я' : 'Партнёр'}:</Text>
              <Text style={styles.diaryText}>{d.text}</Text>
            </View>
          ))}
          {(!data?.diary || data.diary.length === 0) && (
            <Text style={styles.emptyText}>Пока нет записей. Начни первым! ✨</Text>
          )}
        </View>
      </View>

      {/* ❓ ВИКТОРИНА */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>❓ Викторина "Мы"</Text>
        <View style={styles.card}>
          <Text style={styles.cardText}>{data?.quiz?.q || 'Загрузка вопроса...'}</Text>
          {!data?.quiz?.ansM && !data?.quiz?.ansЖ ? (
            <View style={styles.quizOptions}>
              <TouchableOpacity style={styles.quizBtn} onPress={() => submitQuiz('качество')}><Text style={styles.btnText}>💬 Общение</Text></TouchableOpacity>
              <TouchableOpacity style={styles.quizBtn} onPress={() => submitQuiz('близость')}><Text style={styles.btnText}>💕 Близость</Text></TouchableOpacity>
            </View>
          ) : data?.quiz?.revealed ? (
            <View style={styles.quizResult}>
              <Text style={styles.quizResultText}>✨ Ответы открыты!</Text>
              <Text style={styles.quizMatch}>
                {data.quiz.ansM === data.quiz.ansЖ ? '🎉 Вы совпали!' : '💙 Разные взгляды — это тоже круто'}
              </Text>
            </View>
          ) : (
            <Text style={styles.quizWaiting}>⏳ Ожидаем ответ партнёра...</Text>
          )}
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// 🎨 СТИЛИ
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 20, paddingTop: 50 },
  header: { alignItems: 'center', marginBottom: 30 },
  logo: { fontSize: 36, fontWeight: '800', color: COLORS.text, textAlign: 'center', letterSpacing: 2 },
  subtitle: { fontSize: 16, color: COLORS.textDim, textAlign: 'center', marginTop: 8 },
  footer: { textAlign: 'center', color: COLORS.textDim, marginTop: 30, fontSize: 14 },
  card: { backgroundColor: COLORS.card, padding: 20, borderRadius: 20, borderWidth: 1, borderColor: COLORS.cardBorder, marginBottom: 15 },
  cardText: { color: COLORS.text, fontSize: 16, marginBottom: 15, lineHeight: 22 },
  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginBottom: 12 },
  btnPrimary: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 14, alignItems: 'center' },
  btnSecondary: { backgroundColor: 'rgba(255,255,255,0.1)', padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: COLORS.cardBorder },
  btnPeace: { backgroundColor: '#2D4A3E', padding: 16, borderRadius: 14, alignItems: 'center' },
  btnPeaceActive: { backgroundColor: '#4A7C59' },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  input: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: COLORS.cardBorder, padding: 16, borderRadius: 12, color: COLORS.text, fontSize: 16, marginBottom: 12 },
  statusGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  statusBtn: { alignItems: 'center', flex: 1, padding: 8 },
  statusEmoji: { fontSize: 32, marginBottom: 4 },
  statusLabel: { color: COLORS.textDim, fontSize: 11 },
  statusHint: { color: COLORS.textDim, textAlign: 'center', fontSize: 13 },
  divider: { color: COLORS.textDim, marginVertical: 15, textAlign: 'center', fontSize: 14 },
  roleSelector: { flexDirection: 'row', gap: 10 },
  roleBtn: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center' },
  roleBtnActive: { backgroundColor: COLORS.primary, borderWidth: 2, borderColor: COLORS.primary },
  roleText: { color: COLORS.textDim, fontSize: 13 },
  roleTextActive: { color: '#fff', fontWeight: '600' },
  streakBadge: { backgroundColor: 'rgba(255,179,71,0.15)', padding: 10, borderRadius: 10, alignItems: 'center', marginTop: 12, borderWidth: 1, borderColor: 'rgba(255,179,71,0.3)' },
  streakText: { color: COLORS.warning, fontWeight: '600', fontSize: 14 },
  peaceNotification: { backgroundColor: 'rgba(76,175,80,0.15)', padding: 12, borderRadius: 10, marginTop: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(76,175,80,0.3)' },
  peaceText: { color: COLORS.success, fontWeight: '600', fontSize: 15 },
  peaceSubtext: { color: COLORS.textDim, fontSize: 12, marginTop: 2 },
  diaryList: { marginTop: 12 },
  diaryItem: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 10, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: COLORS.secondary },
  diaryBy: { color: COLORS.accent, fontSize: 12, marginBottom: 4, fontWeight: '500' },
  diaryText: { color: COLORS.text, fontSize: 14 },
  emptyText: { color: COLORS.textDim, textAlign: 'center', fontStyle: 'italic', padding: 15 },
  quizOptions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  quizBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', padding: 12, borderRadius: 10, alignItems: 'center' },
  quizResult: { alignItems: 'center', marginTop: 10 },
  quizResultText: { color: COLORS.accent, fontWeight: '600', fontSize: 16 },
  quizMatch: { color: COLORS.text, marginTop: 5, textAlign: 'center' },
  quizWaiting: { color: COLORS.textDim, textAlign: 'center', marginTop: 10, fontStyle: 'italic' },
});