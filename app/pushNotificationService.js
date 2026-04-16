import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('❌ Permission not granted for push notifications');
      return null;
    }
    
    try {
      const pushToken = (await Notifications.getExpoPushTokenAsync({
        projectId: 'your-expo-project-id',
      })).data;
      console.log('✅ Push Token:', pushToken);
      token = pushToken;
    } catch (e) {
      console.error('❌ Error getting push token:', e);
      token = null;
    }
  } else {
    console.log('⚠️ Must use physical device for Push Notifications');
    token = null;
  }

  return token;
}

export async function scheduleDailyReminder(hour = 20, minute = 0) {
  const trigger = {
    hour,
    minute,
    repeats: true,
  };

  const content = {
    title: '💕 Feel In',
    body: 'Не забудь выполнить ритуал дня и проверить настроение!',
    sound: 'default',
  };

  const triggerId = 'daily-reminder';
  const notificationId = await Notifications.scheduleNotificationAsync({
    content,
    trigger,
    identifier: triggerId,
  });

  console.log('🔔 Daily reminder scheduled:', notificationId);
  return notificationId;
}

export async function cancelDailyReminder() {
  await Notifications.cancelScheduledNotificationAsync('daily-reminder');
  console.log('❌ Daily reminder cancelled');
}

export async function scheduleStreakNotification(days) {
  const content = {
    title: '🔥 Поздравляем!',
    body: `Вы поддерживаете связь уже ${days} дней подряд! Так держать!`,
    sound: 'default',
  };

  const notificationId = await Notifications.scheduleNotificationAsync({
    content,
    trigger: null,
  });

  return notificationId;
}