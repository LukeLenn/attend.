import * as Notifications from 'expo-notifications';

const LINES = [
  'A few quiet minutes of attention training?',
  'Your daily listening practice is ready when you are.',
  'Ten minutes, eyes closed, attention outward.',
];

export async function requestPermission(): Promise<boolean> {
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  const res = await Notifications.requestPermissionsAsync();
  return res.granted;
}

/** Replace any reminder with one daily reminder at HH:MM (or none). */
export async function scheduleReminder(on: boolean, time: string): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!on) return;
  const [hour, minute] = time.split(':').map(Number);
  await Notifications.scheduleNotificationAsync({
    content: { title: 'attend', body: LINES[new Date().getDate() % LINES.length] },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
  });
}
