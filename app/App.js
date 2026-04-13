import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, Keyboard, Platform } from 'react-native';
import io from 'socket.io-client';
import axios from 'axios';
import * as Notifications from 'expo-notifications';

// ✅ URL облачного сервера на Render
const SERVER_URL = 'https://feel-in.onrender.com';

// Настройка обработки уведомлений (когда приложение открыто)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function App() {
  const [screen, setScreen] = useState('pairing');
  const [pairCode, setPairCode] = useState('');
  const [userId, setUserId] = useState('A');
  const [data, setData] = useState(null);
  const [socket, setSocket] = useState(null);
  const [diaryText, setDiaryText] = useState('');
  const [pushToken, setPushToken] = useState(null);

  // Подключение к серверу
  useEffect(() => {
    const newSocket = io(SERVER_URL);
    setSocket(newSocket);
    return () => newSocket.disconnect();
  }, []);

  // Запрос разрешений и регистрация токена уведомлений
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          console.log('❌ Нет разрешения на уведомления');
          return;
        }
        
        const token = (await Notifications.getExpoPushTokenAsync()).data;
        console.log('🔔 Expo Push Token:', token);
        setPushToken(token);
        
        // Сохраняем токен в сокете
        if (socket && data?.id) {
          socket.emit('register-push-token', { token, userId, pairCode: data.id });
        }
        
        // Ежедневное напоминание о ритуале в 9:00
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '❤️ Время ритуала!',
            body: 'Напиши комплимент партнёру и укрепи вашу связь ✨',
            data: { screen: 'ritual' },
          },
          trigger: {
            hour: 9,
            minute: 0,
            repeats: true,
          },
        });
        
        console.log('📅 Напоминание о ритуале запланировано на 9:00');
      } catch (error) {
        console.error('Ошибка настройки уведомлений:', error);
      }
    })();
  }, [socket, data, userId]);

  // Отправка токена при подключении к паре
  useEffect(() => {
    if (socket && pushToken && data?.id) {
      socket.emit('register-push-token', { token: pushToken, userId, pairCode: data.id });
    }
  }, [socket, pushToken, data, userId]);

  // Обработка входящих уведомлений
  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('🔔 Получено уведомление:', notification);
    });
    
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('🔔 Пользователь нажал на уведомление');
      const screen = response.notification.request.content.data?.screen;
      if (screen) {
        // Можно добавить навигацию при клике
      }
    });
    
    return () => {
      subscription.remove();
      responseSubscription.remove();
    };
  }, []);

  // Слушаем обновления от сервера в реальном времени
  useEffect(() => {
    if (!socket) return;
    const events = ['status-updated', 'ritual-updated', 'diary-updated', 'peace-updated', 'quiz-updated'];
    const handlers = events.map(evt => {
      const handler = (newData) => setData(newData);
      socket.on(evt, handler);
      return { evt, handler };
    });
    return () => handlers.forEach(({ evt, handler }) => socket.off(evt, handler));
  }, [socket]);

  const createPair = async () => {
    try {
      const res = await axios.post(`${SERVER_URL}/api/pair/create`);
      setPairCode(res.data.code);
      Alert.alert('✅ Пара создана', `Твой код: ${res.data.code}\nСкопируй и отправь партнёру`);
    } catch (e) { Alert.alert('Ошибка', 'Проверь, запущен ли сервер'); }
  };

  const joinPair = async () => {
    if (!pairCode.trim()) return Alert.alert('Внимание', 'Введи код партнёра');
    try {
      const res = await axios.post(`${SERVER_URL}/api/pair/join`, { code: pairCode, userId });
      setData(res.data.pair);
      socket.emit('join-pair', res.data.pairId);
      setScreen('home');
    } catch (e) { Alert.alert('Ошибка', e.response?.data?.error || 'Код неверный или пара заполнена'); }
  };

  const updateStatus = (val) => socket?.emit('update-status', { code: data.id, user: userId, value: val });
  const completeRitual = () => socket?.emit('complete-ritual', { code: data.id });
  const addDiary = () => {
    if (!diaryText.trim()) return;
    socket?.emit('add-diary', { code: data.id, user: userId, text: diaryText });
    setDiaryText('');
    Keyboard.dismiss();
  };
  const sendPeace = () => socket?.emit('peace-request', { code: data.id, user: userId });
  const submitQuiz = (ans) => socket?.emit('quiz-submit', { code: data.id, user: userId, ans });

  if (screen === 'pairing') {
    return (
      <View style={styles.container}>
        <Text style={styles.logo}>Feel in</Text>
        <Text style={styles.subtitle}>Чувствуйте друг друга</Text>
        <TouchableOpacity style={styles.btnPrimary} onPress={createPair}><Text style={styles.btnText}>Создать пару</Text></TouchableOpacity>
        <Text style={styles.divider}>или</Text>
        <TextInput placeholder="Код партнёра (напр. FEEL-ABCD)" value={pairCode} onChangeText={setPairCode} style={styles.input} placeholderTextColor="#666" />
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10, width: '100%' }}>
          <TouchableOpacity style={[styles.btnSecondary, userId === 'A' && styles.btnActive]} onPress={() => setUserId('A')}><Text style={styles.btnText}>Я Партнёр А</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.btnSecondary, userId === 'B' && styles.btnActive]} onPress={() => setUserId('B')}><Text style={styles.btnText}>Я Партнёр Б</Text></TouchableOpacity>
        </View>
        <TouchableOpacity style={[styles.btnPrimary, { marginTop: 15 }]} onPress={joinPair}><Text style={styles.btnText}>Войти в пару</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.header}>🔋 Состояние сегодня</Text>
      <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
        {['🔴', '', '🟢', '⚡'].map(v => (
          <TouchableOpacity key={v} style={styles.statusBtn} onPress={() => updateStatus(v)}>
            <Text style={{ fontSize: 28 }}>{v}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={{ color: '#888', marginTop: 5, textAlign: 'center' }}>
        Моё: {userId === 'A' ? data.statusA : data.statusB} | Партнёра: {userId === 'A' ? data.statusB : data.statusA}
      </Text>

      <Text style={[styles.header, { marginTop: 25 }]}>❤️ Ритуал дня</Text>
      <View style={styles.card}>
        <Text style={styles.cardText}>Напиши 1 комплимент или «спасибо» партнёру</Text>
        <TouchableOpacity style={styles.btnPrimary} onPress={completeRitual}><Text style={styles.btnText}>Выполнено ✓</Text></TouchableOpacity>
        <Text style={{ color: '#FFB347', marginTop: 10, fontWeight: 'bold', textAlign: 'center' }}>🔥 Streak: {data.streak} дн.</Text>
      </View>

      <Text style={[styles.header, { marginTop: 25 }]}>🤝 Кнопка "Мир"</Text>
      <TouchableOpacity style={[styles.btnPeace, data.peace?.active && styles.btnPeaceActive]} onPress={sendPeace}>
        <Text style={styles.btnText}>{data.peace?.active && data.peace.from === userId ? '⏳ Запрос отправлен...' : 'Отправить сигнал мира'}</Text>
      </TouchableOpacity>
      {data.peace?.active && data.peace.from !== userId && (
        <Text style={{ color: '#4CAF50', marginTop: 8, textAlign: 'center', fontWeight: '600' }}>🕊️ Партнёр хочет помириться</Text>
      )}

      <Text style={[styles.header, { marginTop: 25 }]}>📝 Дневник</Text>
      <TextInput placeholder="За что благодарен(на) сегодня?" value={diaryText} onChangeText={setDiaryText} style={styles.input} placeholderTextColor="#666" />
      <TouchableOpacity style={styles.btnSecondary} onPress={addDiary}><Text style={styles.btnText}>Добавить запись</Text></TouchableOpacity>
      <View style={{ marginTop: 10 }}>
        {data.diary?.slice().reverse().slice(0, 5).map((d, i) => (
          <Text key={d.id || i} style={{ color: '#ccc', marginBottom: 5, padding: 8, backgroundColor: '#1A1A1A', borderRadius: 6 }}>
            {d.by}: {d.text}
          </Text>
        ))}
      </View>

      <Text style={[styles.header, { marginTop: 25 }]}>❓ Викторина "Мы"</Text>
      <View style={styles.card}>
        <Text style={styles.cardText}>{data.quiz.q}</Text>
        {!data.quiz.ansA && !data.quiz.ansB ? (
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <TouchableOpacity style={styles.btnSecondary} onPress={() => submitQuiz('качество')}><Text style={styles.btnText}>Общение</Text></TouchableOpacity>
            <TouchableOpacity style={styles.btnSecondary} onPress={() => submitQuiz('близость')}><Text style={styles.btnText}>Близость</Text></TouchableOpacity>
          </View>
        ) : data.quiz.revealed ? (
          <Text style={{ color: '#4CAF50', marginTop: 10, textAlign: 'center', fontWeight: '600' }}>✨ Ответы открыты! Вы совпали: {data.quiz.ansA === data.quiz.ansB ? 'Да 🎉' : 'Нет, и это тоже круто 💙'}</Text>
        ) : (
          <Text style={{ color: '#aaa', marginTop: 10, textAlign: 'center' }}>Ожидание ответа партнёра...</Text>
        )}
      </View>
      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', padding: 20, paddingTop: 50 },
  logo: { fontSize: 32, fontWeight: 'bold', color: '#FF6B6B', textAlign: 'center', marginTop: 40 },
  subtitle: { fontSize: 16, color: '#888', textAlign: 'center', marginBottom: 40 },
  header: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  input: { borderWidth: 1, borderColor: '#333', backgroundColor: '#1A1A1A', padding: 14, borderRadius: 10, color: '#fff', marginTop: 10, width: '100%' },
  btnPrimary: { backgroundColor: '#FF6B6B', padding: 14, borderRadius: 10, alignItems: 'center', width: '100%' },
  btnSecondary: { backgroundColor: '#2A2A2A', padding: 12, borderRadius: 8, alignItems: 'center', flex: 1 },
  btnActive: { borderWidth: 2, borderColor: '#FF6B6B' },
  btnPeace: { backgroundColor: '#2D4A3E', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  btnPeaceActive: { backgroundColor: '#4A7C59' },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  card: { backgroundColor: '#1A1A1A', padding: 15, borderRadius: 12, marginTop: 8 },
  cardText: { color: '#ddd', fontSize: 15 },
  statusBtn: { backgroundColor: '#1A1A1A', padding: 12, borderRadius: 8, alignItems: 'center', flex: 1 },
  divider: { color: '#555', marginVertical: 15, textAlign: 'center' }
});