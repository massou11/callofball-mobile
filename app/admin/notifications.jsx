import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { adminService } from '../../src/services/api';
import { Colors } from '../../src/constants/colors';

const TYPE_CONFIG = {
  NEW_RESERVATION: { emoji: '📋', color: Colors.primary, label: 'Nouvelle réservation' },
  COACHING_PACK:   { emoji: '💪', color: '#A78BFA', label: 'Pack coaching' },
  REFUND:          { emoji: '💸', color: '#EF4444', label: 'Remboursement' },
  CANCELLATION:    { emoji: '❌', color: '#6B7280', label: 'Annulation' },
};

export default function AdminNotifications() {
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await adminService.getNotifications();
      setNotifications(res.data.notifications);
      setUnread(res.data.unreadCount);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const markAllRead = async () => {
    setMarking(true);
    try {
      await adminService.markAllRead();
      setNotifications(n => n.map(notif => ({ ...notif, isRead: true })));
      setUnread(0);
    } catch {}
    finally { setMarking(false); }
  };

  const markRead = async (id) => {
    try {
      await adminService.markRead(id);
      setNotifications(n => n.map(notif => notif.id === id ? { ...notif, isRead: true } : notif));
      setUnread(u => Math.max(0, u - 1));
    } catch {}
  };

  const formatTime = (d) => {
    const date = new Date(d);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000 / 60); // minutes
    if (diff < 1) return 'À l\'instant';
    if (diff < 60) return `Il y a ${diff} min`;
    if (diff < 1440) return `Il y a ${Math.floor(diff / 60)}h`;
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/admin')}><Text style={styles.back}>← Retour</Text></TouchableOpacity>
        <Text style={styles.title}>🔔 Notifications</Text>
        {unread > 0 && (
          <TouchableOpacity onPress={markAllRead} disabled={marking}>
            <Text style={styles.markAllText}>{marking ? '...' : 'Tout lire'}</Text>
          </TouchableOpacity>
        )}
        {unread === 0 && <View style={{ width: 60 }} />}
      </View>

      {unread > 0 && (
        <View style={styles.unreadBanner}>
          <Text style={styles.unreadText}>🔔 {unread} notification{unread > 1 ? 's' : ''} non lue{unread > 1 ? 's' : ''}</Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {notifications.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🔕</Text>
              <Text style={styles.emptyTitle}>Aucune notification</Text>
              <Text style={styles.emptySub}>Les nouvelles réservations et packs coaching apparaîtront ici</Text>
            </View>
          ) : notifications.map(notif => {
            const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.NEW_RESERVATION;
            return (
              <TouchableOpacity
                key={notif.id}
                style={[styles.notifCard, !notif.isRead && styles.notifCardUnread]}
                onPress={() => { if (!notif.isRead) markRead(notif.id); }}
              >
                <View style={[styles.notifIcon, { backgroundColor: config.color + '22' }]}>
                  <Text style={styles.notifEmoji}>{config.emoji}</Text>
                </View>
                <View style={styles.notifBody}>
                  <View style={styles.notifTop}>
                    <Text style={[styles.notifLabel, { color: config.color }]}>{config.label}</Text>
                    <Text style={styles.notifTime}>{formatTime(notif.createdAt)}</Text>
                  </View>
                  <Text style={styles.notifTitle}>{notif.title}</Text>
                  <Text style={styles.notifText}>{notif.body}</Text>
                </View>
                {!notif.isRead && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.secondary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 56, borderBottomWidth: 1, borderBottomColor: '#2A2A3E' },
  back: { color: Colors.gray, fontSize: 14 },
  title: { color: Colors.white, fontSize: 17, fontWeight: '800' },
  markAllText: { color: Colors.primary, fontSize: 13, fontWeight: '600' },
  unreadBanner: { backgroundColor: Colors.primary + '22', padding: 12, paddingHorizontal: 16 },
  unreadText: { color: Colors.primary, fontWeight: '600', fontSize: 13 },
  content: { padding: 16, gap: 10, paddingBottom: 40 },
  empty: { alignItems: 'center', marginTop: 60, gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { color: Colors.white, fontSize: 18, fontWeight: '700' },
  emptySub: { color: Colors.gray, fontSize: 13, textAlign: 'center' },
  notifCard: { flexDirection: 'row', backgroundColor: '#1E1E30', borderRadius: 14, padding: 14, gap: 12, alignItems: 'flex-start' },
  notifCardUnread: { borderWidth: 1, borderColor: Colors.primary + '44', backgroundColor: '#1E1E30' },
  notifIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  notifEmoji: { fontSize: 22 },
  notifBody: { flex: 1, gap: 3 },
  notifTop: { flexDirection: 'row', justifyContent: 'space-between' },
  notifLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  notifTime: { color: Colors.gray, fontSize: 11 },
  notifTitle: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  notifText: { color: Colors.gray, fontSize: 13, lineHeight: 18 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary, marginTop: 4 },
});
