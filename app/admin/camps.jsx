import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Modal, Alert, ActivityIndicator, Switch
} from 'react-native';
import { useRouter } from 'expo-router';
import { campService } from '../../src/services/api';
import { Colors } from '../../src/constants/colors';

const EMPTY_FORM = {
  name: '', description: '', startDate: '', endDate: '',
  minAge: '', maxAge: '', price: '', places: '', isActive: true,
};

export default function AdminCampsScreen() {
  const router = useRouter();
  const [camps, setCamps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCamp, setEditingCamp] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [showRegistrations, setShowRegistrations] = useState(null);
  const [registrations, setRegistrations] = useState([]);

  const loadCamps = useCallback(async () => {
    try {
      setLoading(true);
      const res = await campService.getAll();
      setCamps(res.data);
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de charger les camps');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCamps(); }, [loadCamps]);

  const openCreate = () => {
    setEditingCamp(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (camp) => {
    setEditingCamp(camp);
    setForm({
      name: camp.name,
      description: camp.description || '',
      startDate: camp.startDate.slice(0, 10),
      endDate: camp.endDate.slice(0, 10),
      minAge: camp.minAge?.toString() || '',
      maxAge: camp.maxAge?.toString() || '',
      price: camp.price.toString(),
      places: camp.places.toString(),
      isActive: camp.isActive,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.startDate || !form.endDate || !form.price || !form.places) {
      Alert.alert('Champs manquants', 'Nom, dates, prix et nombre de places sont requis.');
      return;
    }
    setSaving(true);
    try {
      if (editingCamp) {
        await campService.update(editingCamp.id, form);
      } else {
        await campService.create(form);
      }
      setShowForm(false);
      loadCamps();
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de sauvegarder le camp');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (camp) => {
    Alert.alert(
      'Supprimer ce camp ?',
      `"${camp.name}" sera définitivement supprimé.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer', style: 'destructive',
          onPress: async () => {
            try {
              await campService.delete(camp.id);
              loadCamps();
            } catch (e) {
              Alert.alert('Erreur', 'Impossible de supprimer le camp');
            }
          },
        },
      ]
    );
  };

  const handleToggleActive = async (camp) => {
    try {
      await campService.update(camp.id, { isActive: !camp.isActive });
      loadCamps();
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de modifier le camp');
    }
  };

  const loadRegistrations = async (camp) => {
    try {
      const res = await campService.getRegistrations(camp.id);
      setRegistrations(res.data);
      setShowRegistrations(camp);
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de charger les inscrits');
    }
  };

  const formatDate = (d) => {
    if (!d) return '';
    const date = new Date(d);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🏕️ Gestion des Camps</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
          <Text style={styles.addBtnText}>+ Nouveau</Text>
        </TouchableOpacity>
      </View>

      {/* Liste des camps */}
      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={{ gap: 12, padding: 16, paddingBottom: 40 }}>
          {camps.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🏕️</Text>
              <Text style={styles.emptyTitle}>Aucun camp créé</Text>
              <Text style={styles.emptySubtitle}>Appuyez sur "+ Nouveau" pour ajouter votre premier camp</Text>
            </View>
          )}
          {camps.map(camp => (
            <View key={camp.id} style={[styles.campCard, !camp.isActive && styles.campCardInactive]}>
              <View style={styles.campHeader}>
                <View style={styles.campTitleRow}>
                  <Text style={styles.campName}>{camp.name}</Text>
                  <View style={[styles.badge, camp.isActive ? styles.badgeActive : styles.badgeInactive]}>
                    <Text style={styles.badgeText}>{camp.isActive ? 'Actif' : 'Inactif'}</Text>
                  </View>
                </View>
                <Switch
                  value={camp.isActive}
                  onValueChange={() => handleToggleActive(camp)}
                  trackColor={{ false: '#3A3A50', true: Colors.primary }}
                  thumbColor="#fff"
                />
              </View>

              <View style={styles.campDates}>
                <Text style={styles.campDateText}>📅 {formatDate(camp.startDate)} → {formatDate(camp.endDate)}</Text>
              </View>

              {camp.description ? <Text style={styles.campDesc}>{camp.description}</Text> : null}

              <View style={styles.campStats}>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{camp.price}€</Text>
                  <Text style={styles.statLabel}>Tarif</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{camp.placesRestantes}/{camp.places}</Text>
                  <Text style={styles.statLabel}>Places restantes</Text>
                </View>
                {(camp.minAge || camp.maxAge) && (
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>{camp.minAge || '?'}-{camp.maxAge || '?'} ans</Text>
                    <Text style={styles.statLabel}>Âge</Text>
                  </View>
                )}
              </View>

              <View style={styles.campActions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => loadRegistrations(camp)}>
                  <Text style={styles.actionBtnText}>👥 Inscrits ({camp.placesReservees})</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.actionBtnEdit]} onPress={() => openEdit(camp)}>
                  <Text style={styles.actionBtnText}>✏️ Modifier</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDelete]} onPress={() => handleDelete(camp)}>
                  <Text style={styles.actionBtnText}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Modal formulaire création/édition */}
      <Modal visible={showForm} animationType="slide" transparent onRequestClose={() => setShowForm(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>{editingCamp ? '✏️ Modifier le camp' : '🏕️ Nouveau camp'}</Text>

              <Text style={styles.fieldLabel}>Nom du camp *</Text>
              <TextInput style={styles.input} value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} placeholder="Ex: Camp Été 2025" placeholderTextColor="#555" />

              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput style={[styles.input, styles.inputMulti]} value={form.description} onChangeText={v => setForm(f => ({ ...f, description: v }))} placeholder="Présentation du camp..." placeholderTextColor="#555" multiline numberOfLines={3} />

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Date de début *</Text>
                  <TextInput style={styles.input} value={form.startDate} onChangeText={v => setForm(f => ({ ...f, startDate: v }))} placeholder="2025-07-07" placeholderTextColor="#555" />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Date de fin *</Text>
                  <TextInput style={styles.input} value={form.endDate} onChangeText={v => setForm(f => ({ ...f, endDate: v }))} placeholder="2025-07-11" placeholderTextColor="#555" />
                </View>
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Âge min</Text>
                  <TextInput style={styles.input} value={form.minAge} onChangeText={v => setForm(f => ({ ...f, minAge: v }))} placeholder="8" placeholderTextColor="#555" keyboardType="numeric" />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Âge max</Text>
                  <TextInput style={styles.input} value={form.maxAge} onChangeText={v => setForm(f => ({ ...f, maxAge: v }))} placeholder="16" placeholderTextColor="#555" keyboardType="numeric" />
                </View>
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Prix (€) *</Text>
                  <TextInput style={styles.input} value={form.price} onChangeText={v => setForm(f => ({ ...f, price: v }))} placeholder="150" placeholderTextColor="#555" keyboardType="numeric" />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Nb de places *</Text>
                  <TextInput style={styles.input} value={form.places} onChangeText={v => setForm(f => ({ ...f, places: v }))} placeholder="20" placeholderTextColor="#555" keyboardType="numeric" />
                </View>
              </View>

              <View style={styles.toggleRow}>
                <Text style={styles.fieldLabel}>Visible par les clients</Text>
                <Switch
                  value={form.isActive}
                  onValueChange={v => setForm(f => ({ ...f, isActive: v }))}
                  trackColor={{ false: '#3A3A50', true: Colors.primary }}
                  thumbColor="#fff"
                />
              </View>

              <View style={styles.formButtons}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowForm(false)}>
                  <Text style={styles.cancelBtnText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Enregistrer</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal liste des inscrits */}
      <Modal visible={!!showRegistrations} animationType="slide" transparent onRequestClose={() => setShowRegistrations(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>👥 Inscrits — {showRegistrations?.name}</Text>
            <ScrollView style={{ maxHeight: 400 }}>
              {registrations.length === 0 ? (
                <Text style={{ color: Colors.gray, textAlign: 'center', marginTop: 20 }}>Aucun inscrit pour l'instant</Text>
              ) : registrations.map(r => (
                <View key={r.id} style={styles.registrationRow}>
                  <View>
                    <Text style={styles.registrationName}>{r.user.firstName} {r.user.lastName}</Text>
                    <Text style={styles.registrationEmail}>{r.user.email}</Text>
                    {r.user.phone && <Text style={styles.registrationEmail}>📞 {r.user.phone}</Text>}
                  </View>
                  <View style={[styles.badge, r.status === 'CONFIRMED' ? styles.badgeActive : styles.badgePending]}>
                    <Text style={styles.badgeText}>{r.status === 'CONFIRMED' ? 'Confirmé' : 'En attente'}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowRegistrations(null)}>
              <Text style={styles.cancelBtnText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.secondary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 56, borderBottomWidth: 1, borderBottomColor: '#2A2A3E' },
  backBtn: { color: Colors.gray, fontSize: 14 },
  title: { color: Colors.white, fontSize: 17, fontWeight: '800' },
  addBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  list: { flex: 1 },
  empty: { alignItems: 'center', marginTop: 60, gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { color: Colors.white, fontSize: 18, fontWeight: '700' },
  emptySubtitle: { color: Colors.gray, fontSize: 13, textAlign: 'center' },
  campCard: { backgroundColor: '#1E1E30', borderRadius: 16, padding: 16, gap: 12 },
  campCardInactive: { opacity: 0.6 },
  campHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  campTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  campName: { color: Colors.white, fontSize: 16, fontWeight: '800', flex: 1 },
  campDates: {},
  campDateText: { color: Colors.primary, fontSize: 13, fontWeight: '600' },
  campDesc: { color: Colors.gray, fontSize: 13 },
  campStats: { flexDirection: 'row', gap: 16 },
  stat: { alignItems: 'center' },
  statValue: { color: Colors.white, fontWeight: '800', fontSize: 16 },
  statLabel: { color: Colors.gray, fontSize: 11 },
  campActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, backgroundColor: '#252538', borderRadius: 10, padding: 10, alignItems: 'center' },
  actionBtnEdit: { backgroundColor: '#1A3A5C' },
  actionBtnDelete: { flex: 0, paddingHorizontal: 14, backgroundColor: '#3A1A1A' },
  actionBtnText: { color: Colors.white, fontSize: 12, fontWeight: '600' },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeActive: { backgroundColor: 'rgba(76,175,80,0.2)' },
  badgeInactive: { backgroundColor: 'rgba(120,120,120,0.2)' },
  badgePending: { backgroundColor: 'rgba(255,107,0,0.2)' },
  badgeText: { color: Colors.white, fontSize: 10, fontWeight: '700' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1E1E30', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: '90%' },
  modalTitle: { color: Colors.white, fontSize: 20, fontWeight: '800', marginBottom: 20 },
  fieldLabel: { color: Colors.gray, fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#252538', borderRadius: 10, padding: 14, color: Colors.white, fontSize: 14 },
  inputMulti: { height: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  formButtons: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#3A3A50', alignItems: 'center' },
  cancelBtnText: { color: Colors.gray, fontWeight: '600' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: Colors.primary, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700' },
  registrationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#2A2A3E' },
  registrationName: { color: Colors.white, fontWeight: '700' },
  registrationEmail: { color: Colors.gray, fontSize: 12 },
});
