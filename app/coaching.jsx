import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { reservationService, serviceService } from '../src/services/api';
import { Colors } from '../src/constants/colors';

const PACKS = [
  { sessions: 2, price: 60, emoji: '🥈', label: 'Pack 2 séances', desc: 'Idéal pour débuter ou travailler un point précis' },
  { sessions: 4, price: 120, emoji: '🥇', label: 'Pack 4 séances', desc: 'Programme complet pour progresser rapidement' },
];

export default function CoachingScreen() {
  const { pack: packParam, price: priceParam } = useLocalSearchParams();
  const router = useRouter();

  // Pack pré-sélectionné depuis les params (ou null)
  const initialPack = packParam && priceParam
    ? { sessions: parseInt(packParam), price: parseFloat(priceParam) }
    : null;

  const [selectedPack, setSelectedPack] = useState(initialPack);
  const [booking, setBooking] = useState(false);
  const [done, setDone] = useState(false);

  async function handleBook() {
    if (!selectedPack) return;
    setBooking(true);
    try {
      const { data: services } = await serviceService.getAll();
      const coaching = services.find(s => s.type === 'COACHING');
      if (!coaching) throw new Error('Service coaching introuvable');

      await reservationService.create({
        serviceId: coaching.id,
        venueId: null,
        slotId: null,
        participants: 1,
        totalPrice: selectedPack.price,
        notes: `Pack ${selectedPack.sessions} séances — Le coach prendra contact pour convenir des dates.`,
      });
      setDone(true);
    } catch (e) {
      Alert.alert('Erreur', e.response?.data?.error || e.message || 'Impossible de réserver');
    } finally {
      setBooking(false);
    }
  }

  // Écran de confirmation
  if (done) {
    return (
      <View style={styles.container}>
        <View style={styles.successBox}>
          <Text style={styles.successEmoji}>💪</Text>
          <Text style={styles.successTitle}>Demande envoyée !</Text>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmPackTitle}>Pack {selectedPack.sessions} séances — {selectedPack.price}€</Text>
            <Text style={styles.confirmLine}>✅ Votre demande a bien été enregistrée.</Text>
            <Text style={styles.confirmLine}>📞 Notre coach va vous contacter dans les plus brefs délais pour :</Text>
            <View style={styles.steps}>
              <Text style={styles.step}>🗓️  Convenir des dates de vos séances</Text>
              <Text style={styles.step}>🤝  Fixer un rendez-vous pour évaluer vos besoins</Text>
              <Text style={styles.step}>🎯  Construire votre programme personnalisé</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.btnPrimary} onPress={() => router.push('/(tabs)/reservations')}>
            <Text style={styles.btnPrimaryText}>Voir mes réservations</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnOutline} onPress={() => router.push('/(tabs)')}>
            <Text style={styles.btnOutlineText}>Retour à l'accueil</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/(tabs)')}>
          <Text style={styles.back}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>💪 Coaching</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Choisissez votre pack</Text>
        <Text style={styles.subtitle}>Le coach vous contactera pour fixer les dates et évaluer vos besoins.</Text>

        {/* Packs */}
        {PACKS.map(pack => {
          const isSelected = selectedPack?.sessions === pack.sessions;
          return (
            <TouchableOpacity
              key={pack.sessions}
              style={[styles.packCard, isSelected && styles.packCardSelected]}
              onPress={() => setSelectedPack({ sessions: pack.sessions, price: pack.price })}
            >
              <Text style={styles.packEmoji}>{pack.emoji}</Text>
              <View style={styles.packInfo}>
                <Text style={styles.packLabel}>{pack.label}</Text>
                <Text style={styles.packDesc}>{pack.desc}</Text>
              </View>
              <Text style={styles.packPrice}>{pack.price}€</Text>
              {isSelected && <View style={styles.checkBadge}><Text style={{ color: '#fff', fontSize: 12 }}>✓</Text></View>}
            </TouchableOpacity>
          );
        })}

        {/* Info coach */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>📞 Comment ça marche ?</Text>
          <Text style={styles.infoLine}>1. Vous choisissez votre pack et validez la demande</Text>
          <Text style={styles.infoLine}>2. Le coach vous contacte sous 24h</Text>
          <Text style={styles.infoLine}>3. Vous fixez ensemble les dates des séances</Text>
          <Text style={styles.infoLine}>4. Un premier RDV d'évaluation est proposé</Text>
        </View>

        {/* Bouton */}
        <TouchableOpacity
          style={[styles.btnPrimary, !selectedPack && styles.btnDisabled]}
          onPress={handleBook}
          disabled={!selectedPack || booking}
        >
          {booking
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnPrimaryText}>
                {selectedPack ? `Valider ma demande — ${selectedPack.price}€` : 'Sélectionnez un pack'}
              </Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.secondary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#2A2A3E' },
  back: { color: Colors.gray, fontSize: 14 },
  headerTitle: { color: Colors.white, fontSize: 18, fontWeight: '800' },
  content: { padding: 20, gap: 16 },
  title: { color: Colors.white, fontSize: 22, fontWeight: '800' },
  subtitle: { color: Colors.gray, fontSize: 14, lineHeight: 20 },

  packCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E1E30', borderRadius: 16, padding: 18, gap: 14, borderWidth: 2, borderColor: 'transparent' },
  packCardSelected: { borderColor: Colors.primary, backgroundColor: '#1E1E30' },
  packEmoji: { fontSize: 36 },
  packInfo: { flex: 1 },
  packLabel: { color: Colors.white, fontWeight: '800', fontSize: 16 },
  packDesc: { color: Colors.gray, fontSize: 12, marginTop: 3 },
  packPrice: { color: Colors.primary, fontSize: 22, fontWeight: '900' },
  checkBadge: { position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },

  infoBox: { backgroundColor: '#1E1E30', borderRadius: 14, padding: 16, gap: 8 },
  infoTitle: { color: Colors.white, fontWeight: '700', fontSize: 14, marginBottom: 4 },
  infoLine: { color: Colors.gray, fontSize: 13, lineHeight: 20 },

  btnPrimary: { backgroundColor: Colors.primary, padding: 18, borderRadius: 16, alignItems: 'center' },
  btnDisabled: { backgroundColor: '#3A3A50' },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnOutline: { borderWidth: 1.5, borderColor: Colors.gray, padding: 14, borderRadius: 16, alignItems: 'center' },
  btnOutlineText: { color: Colors.white, fontSize: 15, fontWeight: '600' },

  // Succès
  successBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28, gap: 16 },
  successEmoji: { fontSize: 64 },
  successTitle: { color: Colors.white, fontSize: 28, fontWeight: '800' },
  confirmCard: { backgroundColor: '#1E1E30', borderRadius: 16, padding: 20, width: '100%', gap: 10 },
  confirmPackTitle: { color: Colors.primary, fontSize: 17, fontWeight: '800', marginBottom: 4 },
  confirmLine: { color: Colors.white, fontSize: 14, lineHeight: 20 },
  steps: { gap: 8, marginTop: 4 },
  step: { color: Colors.gray, fontSize: 13, lineHeight: 20 },
});
