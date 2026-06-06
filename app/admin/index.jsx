import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { adminService } from '../../src/services/api';
import { Colors } from '../../src/constants/colors';
import { useAuth } from '../../src/context/AuthContext';

const MENU = [
  { id: 'stats',    emoji: '📊', label: 'Statistiques',   route: '/admin/stats' },
  { id: 'planning', emoji: '📅', label: 'Planning',        route: '/admin/planning' },
  { id: 'clients',  emoji: '👥', label: 'Clients',         route: '/admin/clients' },
  { id: 'reservations', emoji: '📋', label: 'Réservations', route: '/admin/reservations' },
  { id: 'camps',    emoji: '🏕️', label: 'Camps',           route: '/admin/camps' },
];

export default function AdminDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [notifCount, setNotifCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [statsRes, notifRes] = await Promise.all([
        adminService.getDetailedStats(),
        adminService.getNotifications(),
      ]);
      setStats(statsRes.data);
      setNotifCount(notifRes.data.unreadCount);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!user || user.role !== 'ADMIN') {
    return (
      <View style={styles.center}>
        <Text style={{ color: Colors.white, fontSize: 18 }}>Accès réservé aux administrateurs</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>⚙️ Administration</Text>
          <Text style={styles.subtitle}>Call of Ball — Tableau de bord</Text>
        </View>
        <TouchableOpacity style={styles.appBtn} onPress={() => router.push('/(tabs)')}>
          <Text style={styles.appBtnText}>← App</Text>
        </TouchableOpacity>
      </View>

      {/* Stats rapides */}
      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />
      ) : stats && (
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { borderTopColor: Colors.primary }]}>
            <Text style={styles.statEmoji}>📋</Text>
            <Text style={[styles.statValue, { color: Colors.primary }]}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total résa</Text>
          </View>
          <View style={[styles.statCard, { borderTopColor: '#F59E0B' }]}>
            <Text style={styles.statEmoji}>⏳</Text>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.pending}</Text>
            <Text style={styles.statLabel}>En attente</Text>
          </View>
          <View style={[styles.statCard, { borderTopColor: '#10B981' }]}>
            <Text style={styles.statEmoji}>✅</Text>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.confirmed}</Text>
            <Text style={styles.statLabel}>Confirmées</Text>
          </View>
          <View style={[styles.statCard, { borderTopColor: '#A78BFA' }]}>
            <Text style={styles.statEmoji}>💰</Text>
            <Text style={[styles.statValue, { color: '#A78BFA' }]}>{stats.revenue}€</Text>
            <Text style={styles.statLabel}>Revenus</Text>
          </View>
        </View>
      )}

      {/* Menu principal */}
      <Text style={styles.sectionTitle}>Gestion</Text>
      <View style={styles.menuGrid}>
        {MENU.map(item => (
          <TouchableOpacity
            key={item.id}
            style={styles.menuCard}
            onPress={() => router.push(item.route)}
          >
            <View style={styles.menuCardTop}>
              <Text style={styles.menuEmoji}>{item.emoji}</Text>
              {item.id === 'notifications' && notifCount > 0 && (
                <View style={styles.badge}><Text style={styles.badgeText}>{notifCount}</Text></View>
              )}
            </View>
            <Text style={styles.menuLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}

        {/* Notifications avec badge */}
        <TouchableOpacity style={styles.menuCard} onPress={() => router.push('/admin/notifications')}>
          <View style={styles.menuCardTop}>
            <Text style={styles.menuEmoji}>🔔</Text>
            {notifCount > 0 && (
              <View style={styles.badge}><Text style={styles.badgeText}>{notifCount}</Text></View>
            )}
          </View>
          <Text style={styles.menuLabel}>Notifications</Text>
          {notifCount > 0 && <Text style={styles.menuSub}>{notifCount} non lue{notifCount > 1 ? 's' : ''}</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.secondary },
  content: { padding: 20, paddingTop: 56, paddingBottom: 40, gap: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.secondary },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 26, fontWeight: '800', color: Colors.white },
  subtitle: { color: Colors.gray, fontSize: 13, marginTop: 2 },
  appBtn: { backgroundColor: '#2A2A3E', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  appBtnText: { color: Colors.white, fontWeight: '600', fontSize: 13 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { backgroundColor: '#1E1E30', borderRadius: 12, padding: 14, width: '47%', borderTopWidth: 3, alignItems: 'center', gap: 4 },
  statEmoji: { fontSize: 22 },
  statValue: { fontSize: 24, fontWeight: '800' },
  statLabel: { color: Colors.gray, fontSize: 11 },
  sectionTitle: { color: Colors.white, fontSize: 18, fontWeight: '700' },
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  menuCard: { backgroundColor: '#1E1E30', borderRadius: 16, padding: 20, width: '47%', gap: 8 },
  menuCardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  menuEmoji: { fontSize: 32 },
  menuLabel: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  menuSub: { color: Colors.primary, fontSize: 11, fontWeight: '600' },
  badge: { backgroundColor: Colors.primary, borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5, marginLeft: 4 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
});
