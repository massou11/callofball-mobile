import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { adminService } from '../../src/services/api';
import { Colors } from '../../src/constants/colors';

const SERVICE_EMOJI = {
  MATCH_AMIS: '🏀', PICKUP_GAME: '⚽', MACHINE_SHOOT: '🎯',
  ANNIVERSAIRE: '🎂', COACHING: '💪', CAMP: '🏕️', TOURNOI: '🏆',
};

const STATUS_COLOR = { PENDING: '#F59E0B', CONFIRMED: '#10B981', CANCELLED: '#EF4444' };
const STATUS_LABEL = { PENDING: 'En attente', CONFIRMED: 'Confirmée', CANCELLED: 'Annulée' };

export default function AdminPlanning() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminService.getPlanning(selectedDate);
      setReservations(res.data);
    } catch (e) { setReservations([]); }
    finally { setLoading(false); }
  }, [selectedDate]);

  useEffect(() => { load(); }, [load]);

  // Navigation jour précédent / suivant
  const changeDay = (delta) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const formatDisplayDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const formatTime = (dt) => dt ? new Date(dt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : null;

  // Grouper par heure
  const withSlot = reservations.filter(r => r.slot);
  const withoutSlot = reservations.filter(r => !r.slot);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/admin')}><Text style={styles.back}>← Retour</Text></TouchableOpacity>
        <Text style={styles.title}>📅 Planning</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Navigation date */}
      <View style={styles.dateNav}>
        <TouchableOpacity style={styles.navBtn} onPress={() => changeDay(-1)}>
          <Text style={styles.navBtnText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.dateDisplay}>
          <Text style={styles.dateText}>{formatDisplayDate(selectedDate)}</Text>
        </View>
        <TouchableOpacity style={styles.navBtn} onPress={() => changeDay(1)}>
          <Text style={styles.navBtnText}>›</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.todayBtn} onPress={() => setSelectedDate(new Date().toISOString().slice(0, 10))}>
        <Text style={styles.todayText}>Aujourd'hui</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {reservations.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>📭</Text>
              <Text style={styles.emptyText}>Aucune réservation ce jour</Text>
            </View>
          ) : (
            <>
              {/* Réservations avec créneau */}
              {withSlot.length > 0 && (
                <>
                  <Text style={styles.groupTitle}>🕐 Créneaux réservés</Text>
                  {withSlot.map(r => (
                    <View key={r.id} style={[styles.card, { borderLeftColor: STATUS_COLOR[r.status] || Colors.gray }]}>
                      <View style={styles.cardHeader}>
                        <View style={styles.cardTime}>
                          <Text style={styles.timeText}>{formatTime(r.slot?.startTime)}</Text>
                          <Text style={styles.timeSep}>→</Text>
                          <Text style={styles.timeText}>{formatTime(r.slot?.endTime)}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[r.status] + '33' }]}>
                          <Text style={[styles.statusText, { color: STATUS_COLOR[r.status] }]}>{STATUS_LABEL[r.status]}</Text>
                        </View>
                      </View>
                      <View style={styles.cardBody}>
                        <Text style={styles.serviceText}>{SERVICE_EMOJI[r.service?.type] || '📋'} {r.service?.name}</Text>
                        {r.venue && <Text style={styles.venueText}>📍 {r.venue.name}</Text>}
                        <Text style={styles.clientText}>👤 {r.user.firstName} {r.user.lastName}</Text>
                        <Text style={styles.clientEmail}>{r.user.email}{r.user.phone ? ` · ${r.user.phone}` : ''}</Text>
                        {r.participants > 1 && <Text style={styles.participantsText}>👥 {r.participants} participants</Text>}
                        {r.notes && <Text style={styles.notesText}>📝 {r.notes}</Text>}
                      </View>
                      <View style={styles.cardFooter}>
                        <Text style={styles.priceText}>{r.totalPrice}€</Text>
                        <TouchableOpacity onPress={() => router.push(`/admin/reservations?id=${r.id}`)}>
                          <Text style={styles.detailLink}>Voir détail →</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </>
              )}

              {/* Demandes sans créneau (coaching, anniversaire, etc.) */}
              {withoutSlot.length > 0 && (
                <>
                  <Text style={styles.groupTitle}>📋 Demandes du jour</Text>
                  {withoutSlot.map(r => (
                    <View key={r.id} style={[styles.card, { borderLeftColor: STATUS_COLOR[r.status] || Colors.gray }]}>
                      <View style={styles.cardHeader}>
                        <Text style={styles.serviceText}>{SERVICE_EMOJI[r.service?.type] || '📋'} {r.service?.name}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[r.status] + '33' }]}>
                          <Text style={[styles.statusText, { color: STATUS_COLOR[r.status] }]}>{STATUS_LABEL[r.status]}</Text>
                        </View>
                      </View>
                      <View style={styles.cardBody}>
                        <Text style={styles.clientText}>👤 {r.user.firstName} {r.user.lastName}</Text>
                        <Text style={styles.clientEmail}>{r.user.email}{r.user.phone ? ` · ${r.user.phone}` : ''}</Text>
                        {r.notes && <Text style={styles.notesText}>📝 {r.notes}</Text>}
                      </View>
                      <View style={styles.cardFooter}>
                        <Text style={styles.priceText}>{r.totalPrice}€</Text>
                        <TouchableOpacity onPress={() => router.push(`/admin/reservations?id=${r.id}`)}>
                          <Text style={styles.detailLink}>Voir détail →</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </>
              )}
            </>
          )}
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
  dateNav: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8 },
  navBtn: { backgroundColor: '#1E1E30', borderRadius: 10, width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  navBtnText: { color: Colors.white, fontSize: 22, fontWeight: '700' },
  dateDisplay: { flex: 1, alignItems: 'center' },
  dateText: { color: Colors.white, fontWeight: '700', fontSize: 15, textTransform: 'capitalize' },
  todayBtn: { alignSelf: 'center', marginBottom: 4, paddingHorizontal: 16, paddingVertical: 6, backgroundColor: '#1E1E30', borderRadius: 20 },
  todayText: { color: Colors.primary, fontWeight: '600', fontSize: 13 },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  empty: { alignItems: 'center', marginTop: 60, gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { color: Colors.gray, fontSize: 15 },
  groupTitle: { color: Colors.gray, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  card: { backgroundColor: '#1E1E30', borderRadius: 14, padding: 14, gap: 10, borderLeftWidth: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTime: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeText: { color: Colors.white, fontWeight: '800', fontSize: 16 },
  timeSep: { color: Colors.gray },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },
  cardBody: { gap: 4 },
  serviceText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  venueText: { color: Colors.gray, fontSize: 13 },
  clientText: { color: Colors.white, fontSize: 13, fontWeight: '600' },
  clientEmail: { color: Colors.gray, fontSize: 12 },
  participantsText: { color: Colors.gray, fontSize: 12 },
  notesText: { color: '#A78BFA', fontSize: 12, fontStyle: 'italic' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#2A2A3E', paddingTop: 8 },
  priceText: { color: Colors.primary, fontWeight: '800', fontSize: 16 },
  detailLink: { color: Colors.primary, fontSize: 13, fontWeight: '600' },
});
