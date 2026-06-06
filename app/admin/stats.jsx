import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { adminService } from '../../src/services/api';
import { Colors } from '../../src/constants/colors';

export default function AdminStats() {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const [from, setFrom] = useState(firstOfMonth);
  const [to, setTo] = useState(today.toISOString().slice(0, 10));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminService.getDetailedStats({ from, to });
      setStats(res.data);
    } catch { Alert.alert('Erreur', 'Impossible de charger les statistiques'); }
    finally { setLoading(false); }
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await adminService.exportCSV({ from, to });
      // Sur web : téléchargement automatique
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `callofball_export_${from}_${to}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { Alert.alert('Erreur', "Impossible de générer l'export"); }
    finally { setExporting(false); }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('fr-FR');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/admin')}><Text style={styles.back}>← Retour</Text></TouchableOpacity>
        <Text style={styles.title}>📊 Statistiques</Text>
        <TouchableOpacity style={styles.exportBtn} onPress={handleExport} disabled={exporting}>
          {exporting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.exportText}>⬇️ Export</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Filtre période */}
        <View style={styles.filterCard}>
          <Text style={styles.filterTitle}>Période d'analyse</Text>
          <View style={styles.filterRow}>
            <View style={styles.filterField}>
              <Text style={styles.fieldLabel}>Du</Text>
              <TextInput style={styles.dateInput} value={from} onChangeText={setFrom} placeholder="YYYY-MM-DD" placeholderTextColor="#555" />
            </View>
            <View style={styles.filterField}>
              <Text style={styles.fieldLabel}>Au</Text>
              <TextInput style={styles.dateInput} value={to} onChangeText={setTo} placeholder="YYYY-MM-DD" placeholderTextColor="#555" />
            </View>
            <TouchableOpacity style={styles.applyBtn} onPress={load}>
              <Text style={styles.applyText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading ? <ActivityIndicator color={Colors.primary} style={{ marginTop: 32 }} /> : stats && (
          <>
            {/* KPIs */}
            <View style={styles.kpiGrid}>
              {[
                { label: 'Réservations', value: stats.total, color: Colors.primary, emoji: '📋' },
                { label: 'Confirmées', value: stats.confirmed, color: '#10B981', emoji: '✅' },
                { label: 'En attente', value: stats.pending, color: '#F59E0B', emoji: '⏳' },
                { label: 'Annulées', value: stats.cancelled, color: '#EF4444', emoji: '❌' },
              ].map(k => (
                <View key={k.label} style={[styles.kpiCard, { borderTopColor: k.color }]}>
                  <Text style={styles.kpiEmoji}>{k.emoji}</Text>
                  <Text style={[styles.kpiValue, { color: k.color }]}>{k.value}</Text>
                  <Text style={styles.kpiLabel}>{k.label}</Text>
                </View>
              ))}
            </View>

            {/* Revenus */}
            <View style={styles.revenueCard}>
              <Text style={styles.revenueLabel}>💰 Revenus confirmés</Text>
              <Text style={styles.revenueValue}>{stats.revenue.toFixed(2)} €</Text>
              <Text style={styles.revenuePeriod}>Du {formatDate(stats.period.from)} au {formatDate(stats.period.to)}</Text>
            </View>

            {/* Répartition par service */}
            <Text style={styles.sectionTitle}>Répartition par service</Text>
            {stats.byService?.map(s => (
              <View key={s.serviceId} style={styles.serviceRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.serviceName}>{s.service?.name || 'Service'}</Text>
                  <Text style={styles.serviceCount}>{s._count.id} réservation{s._count.id > 1 ? 's' : ''}</Text>
                </View>
                <Text style={styles.serviceRevenue}>{(s._sum.totalPrice || 0).toFixed(2)} €</Text>
              </View>
            ))}

            {/* Export info */}
            <View style={styles.exportInfo}>
              <Text style={styles.exportInfoText}>📄 L'export CSV inclut toutes les réservations confirmées sur la période sélectionnée, compatible Excel et tout logiciel de comptabilité.</Text>
              <TouchableOpacity style={styles.exportBtnLarge} onPress={handleExport} disabled={exporting}>
                {exporting ? <ActivityIndicator color="#fff" /> : <Text style={styles.exportBtnText}>⬇️ Télécharger l'export comptabilité</Text>}
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.secondary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 56, borderBottomWidth: 1, borderBottomColor: '#2A2A3E' },
  back: { color: Colors.gray, fontSize: 14 },
  title: { color: Colors.white, fontSize: 17, fontWeight: '800' },
  exportBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  exportText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  filterCard: { backgroundColor: '#1E1E30', borderRadius: 14, padding: 16, gap: 10 },
  filterTitle: { color: Colors.white, fontWeight: '700' },
  filterRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  filterField: { flex: 1, gap: 4 },
  fieldLabel: { color: Colors.gray, fontSize: 11 },
  dateInput: { backgroundColor: '#252538', borderRadius: 8, padding: 10, color: Colors.white, fontSize: 13 },
  applyBtn: { backgroundColor: Colors.primary, borderRadius: 8, padding: 10, paddingHorizontal: 14 },
  applyText: { color: '#fff', fontWeight: '700' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCard: { backgroundColor: '#1E1E30', borderRadius: 12, padding: 14, width: '47%', borderTopWidth: 3, alignItems: 'center', gap: 4 },
  kpiEmoji: { fontSize: 20 },
  kpiValue: { fontSize: 28, fontWeight: '900' },
  kpiLabel: { color: Colors.gray, fontSize: 11 },
  revenueCard: { backgroundColor: '#1E1E30', borderRadius: 14, padding: 20, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#A78BFA' },
  revenueLabel: { color: Colors.gray, fontSize: 14 },
  revenueValue: { color: '#A78BFA', fontSize: 40, fontWeight: '900' },
  revenuePeriod: { color: Colors.gray, fontSize: 12 },
  sectionTitle: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  serviceRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E1E30', borderRadius: 12, padding: 14 },
  serviceName: { color: Colors.white, fontWeight: '700' },
  serviceCount: { color: Colors.gray, fontSize: 12 },
  serviceRevenue: { color: Colors.primary, fontWeight: '800', fontSize: 16 },
  exportInfo: { backgroundColor: '#1E1E30', borderRadius: 14, padding: 16, gap: 12 },
  exportInfoText: { color: Colors.gray, fontSize: 13, lineHeight: 20 },
  exportBtnLarge: { backgroundColor: Colors.primary, padding: 16, borderRadius: 12, alignItems: 'center' },
  exportBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
