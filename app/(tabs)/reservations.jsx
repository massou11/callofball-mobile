import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { reservationService } from '../../src/services/api';
import { Colors } from '../../src/constants/colors';

const STATUS_LABELS = {
  PENDING: { label: 'En attente', color: Colors.warning },
  CONFIRMED: { label: 'Confirmée', color: Colors.success },
  CANCELLED: { label: 'Annulée', color: Colors.error },
  COMPLETED: { label: 'Terminée', color: Colors.gray },
};

export default function ReservationsScreen() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const { data } = await reservationService.getMine();
      setReservations(data);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger vos réservations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCancel(id) {
    Alert.alert('Annuler ?', 'Voulez-vous annuler cette réservation ?', [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Oui, annuler', style: 'destructive', onPress: async () => {
          try {
            await reservationService.cancel(id);
            load();
          } catch (e) {
            Alert.alert('Erreur', e.response?.data?.error || 'Impossible d\'annuler');
          }
        }
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
    >
      <Text style={styles.title}>Mes réservations</Text>

      {reservations.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🏀</Text>
          <Text style={styles.emptyText}>Aucune réservation pour l'instant</Text>
          <Text style={styles.emptySubtext}>Commencez par réserver un terrain !</Text>
        </View>
      ) : (
        reservations.map(r => {
          const status = STATUS_LABELS[r.status];
          return (
            <View key={r.id} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.serviceName}>{r.service?.name}</Text>
                <View style={[styles.statusBadge, { backgroundColor: status.color + '22' }]}>
                  <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                </View>
              </View>
              {r.venue && <Text style={styles.venue}>📍 {r.venue.name}</Text>}
              {r.slot && (
                <Text style={styles.slot}>
                  🕐 {new Date(r.slot.startTime).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} — {new Date(r.slot.startTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              )}
              <View style={styles.cardBottom}>
                <Text style={styles.price}>{r.totalPrice}€</Text>
                {(r.status === 'PENDING' || r.status === 'CONFIRMED') && (
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(r.id)}>
                    <Text style={styles.cancelText}>Annuler</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.secondary },
  content: { padding: 20, paddingTop: 56, paddingBottom: 40, gap: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.secondary },
  title: { fontSize: 28, fontWeight: '800', color: Colors.white, marginBottom: 8 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  emptyEmoji: { fontSize: 60 },
  emptyText: { color: Colors.white, fontSize: 18, fontWeight: '700' },
  emptySubtext: { color: Colors.gray, fontSize: 14 },
  card: { backgroundColor: '#1E1E30', borderRadius: 16, padding: 16, gap: 8 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  serviceName: { color: Colors.white, fontWeight: '700', fontSize: 16, flex: 1 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: '700' },
  venue: { color: Colors.gray, fontSize: 13 },
  slot: { color: Colors.gray, fontSize: 13 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  price: { color: Colors.primary, fontWeight: '800', fontSize: 18 },
  cancelBtn: { borderWidth: 1, borderColor: Colors.error, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  cancelText: { color: Colors.error, fontWeight: '600', fontSize: 13 },
});
