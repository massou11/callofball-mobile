import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { Colors } from '../../src/constants/colors';
import { StatusBar } from 'expo-status-bar';
import { useState, useEffect } from 'react';
import { campService } from '../../src/services/api';

const SERVICES = [
  {
    emoji: '⚽', label: 'Pickup Game', subtitle: 'Rejoignez un match', color: '#FF6B00',
    submenu: {
      title: '⚽ Pickup Game',
      subtitle: 'Match libre avec d\'autres joueurs · Lun-Ven 18h-20h',
      options: [
        { emoji: '⚽', label: 'Rejoindre un Pickup', subtitle: '8€/pers · 20 places max par soir', route: '/book?type=PICKUP_GAME' },
      ],
    },
  },
  {
    emoji: '🏀', label: 'Match Entre Amis', subtitle: 'Terrains & Cage', color: '#6C63FF',
    submenu: {
      title: '🏀 Choisissez votre terrain',
      subtitle: 'Réservez un espace de jeu',
      options: [
        { emoji: '🏟️', label: 'Grand Terrain 5x5', subtitle: '10 joueurs · HC 75€/h · HP 95€/h', route: '/book?service=match-5x5' },
        { emoji: '🏀', label: 'Demi-Terrain 5x5', subtitle: '8 joueurs · HC 45€/h · HP 60€/h', route: '/book?service=match-grand-3x3' },
        { emoji: '🔶', label: 'Terrain 3x3', subtitle: '6 joueurs · HC 30€/h · HP 40€/h', route: '/book?service=match-3x3' },
        { emoji: '🥊', label: 'La Cage (1vs1)', subtitle: '1-4 joueurs · HC 6€/h · HP 8€/h', route: '/book?service=cage-service' },
      ],
    },
  },
  {
    emoji: '🎯', label: 'Machine à Shoot', subtitle: 'Entraînez-vous', color: '#00BCD4',
    submenu: {
      title: '🎯 Machine à Shoot',
      subtitle: 'Séances d\'entraînement au tir',
      options: [
        { emoji: '⏱️', label: '30 minutes', subtitle: '1-2 joueurs · 15€/séance', route: '/book?type=MACHINE_SHOOT&duration=30' },
        { emoji: '⏱️', label: '1 heure', subtitle: '1-2 joueurs · 25€/séance', route: '/book?type=MACHINE_SHOOT&duration=60' },
      ],
    },
  },
  {
    emoji: '🎂', label: 'Anniversaire', subtitle: '3 formules disponibles', color: '#E91E63',
    submenu: {
      title: '🎂 Anniversaire',
      subtitle: 'Choisissez votre formule',
      options: [
        { emoji: '🥉', label: 'Formule Rookie', subtitle: '8 personnes · 1h30 de jeu · 120€', route: '/book?service=anniversaire-rookie' },
        { emoji: '🥈', label: 'Formule Star', subtitle: '10 personnes · 2h de jeu · 150€', route: '/book?service=anniversaire-star' },
        { emoji: '🥇', label: 'Formule All-Star', subtitle: '10 personnes · 2h de jeu · 200€', route: '/book?service=anniversaire-all-star' },
      ],
    },
  },
  {
    emoji: '🏕️', label: 'Camps', subtitle: 'Stages & séjours basket', color: '#FFD700', isCamps: true,
  },
  {
    emoji: '💪', label: 'Coaching', subtitle: 'Progressez vite', color: '#4CAF50',
    submenu: {
      title: '💪 Coaching',
      subtitle: 'Séances avec nos coachs',
      options: [
        { emoji: '🥈', label: 'Pack 2 séances', subtitle: '60€ · Le coach vous contacte pour fixer les dates', route: '/coaching?pack=2&price=60' },
        { emoji: '🥇', label: 'Pack 4 séances', subtitle: '120€ · Le coach vous contacte pour fixer les dates', route: '/coaching?pack=4&price=120' },
      ],
    },
  },
];

const HORAIRES = [
  { jour: 'Lun / Mar / Jeu / Ven', heures: '15h – 22h' },
  { jour: 'Mercredi', heures: '10h – 22h' },
  { jour: 'Sam / Dim', heures: '10h – 17h' },
];

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeSubmenu, setActiveSubmenu] = useState(null);
  const [camps, setCamps] = useState([]);
  const [campsLoading, setCampsLoading] = useState(false);

  useEffect(() => {
    campService.getAll().then(r => setCamps(r.data)).catch(() => {});
  }, []);

  const handleServicePress = (s) => {
    if (s.isCamps) {
      // Construire le sous-menu dynamiquement depuis les camps en base
      if (campsLoading) return;
      const formatDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
      const options = camps.length > 0
        ? camps.map(c => ({
            emoji: '🏕️',
            label: c.name,
            subtitle: `${formatDate(c.startDate)} → ${formatDate(c.endDate)} · ${c.price}€ · ${c.placesRestantes} place${c.placesRestantes > 1 ? 's' : ''} restante${c.placesRestantes > 1 ? 's' : ''}`,
            route: `/camp/${c.id}`,
          }))
        : [{ emoji: '📅', label: 'Aucun camp disponible', subtitle: 'Revenez bientôt !', route: null }];
      setActiveSubmenu({ title: '🏕️ Camps de basket', subtitle: 'Stages & séjours', options });
    } else if (s.submenu.options.length === 1) {
      router.push(s.submenu.options[0].route);
    } else {
      setActiveSubmenu(s.submenu);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <StatusBar style="light" />

      {/* Modal sous-menu générique */}
      <Modal
        visible={!!activeSubmenu}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveSubmenu(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setActiveSubmenu(null)}>
          <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{activeSubmenu?.title}</Text>
            <Text style={styles.modalSubtitle}>{activeSubmenu?.subtitle}</Text>
            {activeSubmenu?.options.map(opt => (
              <TouchableOpacity
                key={opt.label}
                style={styles.optionRow}
                onPress={() => { if (!opt.route) return; setActiveSubmenu(null); router.push(opt.route); }}
              >
                <Text style={styles.optionEmoji}>{opt.emoji}</Text>
                <View style={styles.optionInfo}>
                  <Text style={styles.optionLabel}>{opt.label}</Text>
                  <Text style={styles.optionSubtitle}>{opt.subtitle}</Text>
                </View>
                <Text style={styles.optionArrow}>→</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalClose} onPress={() => setActiveSubmenu(null)}>
              <Text style={styles.modalCloseText}>Annuler</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Bonjour, {user?.firstName} 👋</Text>
          <Text style={styles.tagline}>Prêt à jouer ?</Text>
        </View>
        <View style={styles.logoBadge}>
          <Text style={{ fontSize: 28 }}>🏀</Text>
        </View>
      </View>

      {/* CTA principal */}
      <TouchableOpacity style={styles.ctaCard} onPress={() => router.push('/book')}>
        <Text style={styles.ctaTitle}>Réserver maintenant</Text>
        <Text style={styles.ctaSubtitle}>Terrains disponibles dès aujourd'hui →</Text>
      </TouchableOpacity>

      {/* Services */}
      <Text style={styles.sectionTitle}>Nos services</Text>
      <View style={styles.grid}>
        {SERVICES.map(s => (
          <TouchableOpacity
            key={s.label}
            style={[styles.serviceCard, { borderTopColor: s.color }]}
            onPress={() => handleServicePress(s)}
          >
            <Text style={styles.serviceEmoji}>{s.emoji}</Text>
            <Text style={styles.serviceLabel}>{s.label}</Text>
            <Text style={styles.serviceSubtitle}>{s.subtitle}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Horaires */}
      <Text style={styles.sectionTitle}>Horaires d'ouverture</Text>
      <View style={styles.horaireCard}>
        {HORAIRES.map(h => (
          <View key={h.jour} style={styles.horaireRow}>
            <Text style={styles.horaireJour}>{h.jour}</Text>
            <Text style={styles.horaireHeure}>{h.heures}</Text>
          </View>
        ))}
        <View style={styles.adresseRow}>
          <Text style={styles.adresse}>📍 3 Rue de la Jalousie, 44980 Sainte-Luce-sur-Loire</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.secondary },
  content: { padding: 20, paddingTop: 56, gap: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { fontSize: 22, fontWeight: '800', color: Colors.white },
  tagline: { color: Colors.gray, fontSize: 14, marginTop: 4 },
  logoBadge: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  ctaCard: { backgroundColor: Colors.primary, borderRadius: 16, padding: 24 },
  ctaTitle: { color: Colors.white, fontSize: 22, fontWeight: '800' },
  ctaSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 4 },
  sectionTitle: { color: Colors.white, fontSize: 18, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  serviceCard: { backgroundColor: '#1E1E30', borderRadius: 12, padding: 16, width: '47%', borderTopWidth: 3, gap: 4 },
  serviceEmoji: { fontSize: 28 },
  serviceLabel: { color: Colors.white, fontWeight: '700', fontSize: 13 },
  serviceSubtitle: { color: Colors.gray, fontSize: 11 },
  horaireCard: { backgroundColor: '#1E1E30', borderRadius: 16, padding: 20, gap: 12 },
  horaireRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  horaireJour: { color: Colors.gray, fontSize: 13 },
  horaireHeure: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  adresseRow: { borderTopWidth: 1, borderTopColor: '#2A2A3E', paddingTop: 12 },
  adresse: { color: Colors.gray, fontSize: 12, textAlign: 'center' },

  // Modal générique
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1E1E30', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, gap: 12 },
  modalHandle: { width: 40, height: 4, backgroundColor: '#3A3A50', borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
  modalTitle: { color: Colors.white, fontSize: 20, fontWeight: '800' },
  modalSubtitle: { color: Colors.gray, fontSize: 13, marginBottom: 4 },
  optionRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#252538', borderRadius: 14, padding: 16, gap: 14 },
  optionEmoji: { fontSize: 28 },
  optionInfo: { flex: 1 },
  optionLabel: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  optionSubtitle: { color: Colors.gray, fontSize: 12, marginTop: 2 },
  optionArrow: { color: Colors.primary, fontSize: 18, fontWeight: '700' },
  modalClose: { marginTop: 4, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#3A3A50', alignItems: 'center' },
  modalCloseText: { color: Colors.gray, fontWeight: '600' },
});
