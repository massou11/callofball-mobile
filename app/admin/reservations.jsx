import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, TextInput, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { reservationService, adminService } from '../../src/services/api';
import { Colors } from '../../src/constants/colors';

const STATUS_COLOR = { PENDING: '#F59E0B', CONFIRMED: '#10B981', CANCELLED: '#EF4444', COMPLETED: '#6B7280' };
const STATUS_LABEL = { PENDING: 'En attente', CONFIRMED: 'Confirmée', CANCELLED: 'Annulée', COMPLETED: 'Terminée' };
const SERVICE_EMOJI = { MATCH_AMIS: '🏀', PICKUP_GAME: '⚽', MACHINE_SHOOT: '🎯', ANNIVERSAIRE: '🎂', COACHING: '💪', CAMP: '🏕️', TOURNOI: '🏆' };
const FILTERS = ['Toutes', 'PENDING', 'CONFIRMED', 'CANCELLED'];

export default function AdminReservations() {
  const router = useRouter();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('PENDING');
  const [refundModal, setRefundModal] = useState(null);
  const [refundReason, setRefundReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter !== 'Toutes' ? { status: filter } : {};
      const res = await reservationService.getAll(params);
      setReservations(res.data);
    } catch { Alert.alert('Erreur', 'Impossible de charger les réservations'); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleConfirm = async (id) => {
    try {
      await reservationService.confirm(id);
      load();
    } catch { Alert.alert('Erreur', 'Impossible de confirmer'); }
  };

  const handleRefund = async () => {
    if (!refundModal) return;
    setProcessing(true);
    try {
      await adminService.refund(refundModal.id, refundReason);
      setRefundModal(null);
      setRefundReason('');
      load();
      Alert.alert('✅ Remboursement traité', 'La réservation a été annulée et le remboursement enregistré.');
    } catch (e) {
      Alert.alert('Erreur', e.response?.data?.error || 'Impossible de traiter le remboursement');
    } finally { setProcessing(false); }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
  const formatTime = (d) => d ? new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/admin')}><Text style={styles.back}>← Retour</Text></TouchableOpacity>
        <Text style={styles.title}>📋 Réservations</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Filtres */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters} contentContainerStyle={styles.filtersContent}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f} style={[styles.filterBtn, filter === f && styles.filterBtnActive]} onPress={() => setFilter(f)}>
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'Toutes' ? 'Toutes' : STATUS_LABEL[f]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.countText}>{reservations.length} réservation{reservations.length > 1 ? 's' : ''}</Text>
          {reservations.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>📭</Text>
              <Text style={styles.emptyText}>Aucune réservation dans cette catégorie</Text>
            </View>
          ) : reservations.map(r => (
            <View key={r.id} style={[styles.card, { borderLeftColor: STATUS_COLOR[r.status] }]}>
              {/* En-tête */}
              <View style={styles.cardHeader}>
                <Text style={styles.serviceName}>{SERVICE_EMOJI[r.service?.type] || '📋'} {r.service?.name}</Text>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[r.status] + '22' }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLOR[r.status] }]}>{STATUS_LABEL[r.status]}</Text>
                </View>
              </View>

              {/* Détails */}
              <View style={styles.cardDetails}>
                <View style={styles.detailRow}><Text style={styles.detailLabel}>👤 Client</Text><Text style={styles.detailValue}>{r.user?.firstName} {r.user?.lastName}</Text></View>
                <View style={styles.detailRow}><Text style={styles.detailLabel}>✉️ Email</Text><Text style={styles.detailValue}>{r.user?.email}</Text></View>
                {r.venue && <View style={styles.detailRow}><Text style={styles.detailLabel}>📍 Terrain</Text><Text style={styles.detailValue}>{r.venue.name}</Text></View>}
                {r.slot && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>🕐 Créneau</Text>
                    <Text style={styles.detailValue}>{formatTime(r.slot.startTime)} – {formatTime(r.slot.endTime)}</Text>
                  </View>
                )}
                <View style={styles.detailRow}><Text style={styles.detailLabel}>📅 Date</Text><Text style={styles.detailValue}>{formatDate(r.createdAt)}</Text></View>
                {r.participants > 1 && <View style={styles.detailRow}><Text style={styles.detailLabel}>👥 Participants</Text><Text style={styles.detailValue}>{r.participants}</Text></View>}
                {r.notes && <View style={styles.notesBox}><Text style={styles.notesText}>📝 {r.notes}</Text></View>}
              </View>

              {/* Prix + actions */}
              <View style={styles.cardFooter}>
                <Text style={styles.price}>{r.totalPrice}€</Text>
                <View style={styles.actions}>
                  {r.status === 'PENDING' && (
                    <TouchableOpacity style={styles.confirmBtn} onPress={() => handleConfirm(r.id)}>
                      <Text style={styles.actionText}>✅ Confirmer</Text>
                    </TouchableOpacity>
                  )}
                  {r.status !== 'CANCELLED' && (
                    <TouchableOpacity style={styles.refundBtn} onPress={() => { setRefundModal(r); setRefundReason(''); }}>
                      <Text style={styles.actionText}>💸 Rembourser</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Modal remboursement */}
      <Modal visible={!!refundModal} transparent animationType="slide" onRequestClose={() => setRefundModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>💸 Remboursement</Text>
            <Text style={styles.modalSubtitle}>
              {refundModal?.user?.firstName} {refundModal?.user?.lastName} — {refundModal?.service?.name}
            </Text>
            <Text style={styles.modalAmount}>Montant : {refundModal?.totalPrice}€</Text>
            <Text style={styles.modalLabel}>Motif du remboursement (optionnel)</Text>
            <TextInput
              style={styles.reasonInput}
              value={refundReason}
              onChangeText={setRefundReason}
              placeholder="Ex: Annulation exceptionnelle..."
              placeholderTextColor="#555"
              multiline
            />
            <Text style={styles.modalWarning}>⚠️ Cette action annule la réservation et enregistre le remboursement. Le virement doit être effectué manuellement.</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setRefundModal(null)}>
                <Text style={styles.cancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmRefundBtn} onPress={handleRefund} disabled={processing}>
                {processing ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmRefundText}>Confirmer le remboursement</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.secondary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 56, borderBottomWidth: 1, borderBottomColor: '#2A2A3E' },
  back: { color: Colors.gray, fontSize: 14 },
  title: { color: Colors.white, fontSize: 17, fontWeight: '800' },
  filters: { borderBottomWidth: 1, borderBottomColor: '#2A2A3E' },
  filtersContent: { padding: 12, gap: 8 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1E1E30', borderWidth: 1.5, borderColor: 'transparent' },
  filterBtnActive: { borderColor: Colors.primary },
  filterText: { color: Colors.gray, fontWeight: '600', fontSize: 13 },
  filterTextActive: { color: Colors.primary },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  countText: { color: Colors.gray, fontSize: 13 },
  empty: { alignItems: 'center', marginTop: 40, gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { color: Colors.gray, fontSize: 14 },
  card: { backgroundColor: '#1E1E30', borderRadius: 14, padding: 14, gap: 12, borderLeftWidth: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  serviceName: { color: Colors.white, fontWeight: '800', fontSize: 15, flex: 1 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },
  cardDetails: { gap: 6 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailLabel: { color: Colors.gray, fontSize: 12, flex: 1 },
  detailValue: { color: Colors.white, fontSize: 12, fontWeight: '600', flex: 2, textAlign: 'right' },
  notesBox: { backgroundColor: '#252538', borderRadius: 8, padding: 10, marginTop: 4 },
  notesText: { color: '#A78BFA', fontSize: 12, fontStyle: 'italic' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#2A2A3E', paddingTop: 10 },
  price: { color: Colors.primary, fontWeight: '900', fontSize: 18 },
  actions: { flexDirection: 'row', gap: 8 },
  confirmBtn: { backgroundColor: '#10B98133', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  refundBtn: { backgroundColor: '#EF444433', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  actionText: { color: Colors.white, fontSize: 12, fontWeight: '700' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1E1E30', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, gap: 12 },
  modalTitle: { color: Colors.white, fontSize: 22, fontWeight: '800' },
  modalSubtitle: { color: Colors.gray },
  modalAmount: { color: Colors.primary, fontWeight: '800', fontSize: 18 },
  modalLabel: { color: Colors.gray, fontSize: 12 },
  reasonInput: { backgroundColor: '#252538', borderRadius: 10, padding: 14, color: Colors.white, minHeight: 80, textAlignVertical: 'top' },
  modalWarning: { color: '#F59E0B', fontSize: 12, lineHeight: 18 },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#3A3A50', alignItems: 'center' },
  cancelText: { color: Colors.gray, fontWeight: '600' },
  confirmRefundBtn: { flex: 2, padding: 14, borderRadius: 12, backgroundColor: '#EF4444', alignItems: 'center' },
  confirmRefundText: { color: '#fff', fontWeight: '700' },
});
