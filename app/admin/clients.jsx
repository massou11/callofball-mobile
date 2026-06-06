import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { adminService } from '../../src/services/api';
import { Colors } from '../../src/constants/colors';

export default function AdminClients() {
  const router = useRouter();
  const [clients, setClients] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    adminService.getClients()
      .then(r => { setClients(r.data); setFiltered(r.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(clients.filter(c =>
      c.firstName.toLowerCase().includes(q) ||
      c.lastName.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.phone || '').includes(q)
    ));
  }, [search, clients]);

  const formatDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/admin')}><Text style={styles.back}>← Retour</Text></TouchableOpacity>
        <Text style={styles.title}>👥 Clients</Text>
        <Text style={styles.count}>{clients.length} inscrits</Text>
      </View>

      {/* Recherche */}
      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="🔍  Rechercher un client..."
          placeholderTextColor="#555"
        />
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {filtered.length === 0 ? (
            <Text style={{ color: Colors.gray, textAlign: 'center', marginTop: 40 }}>Aucun client trouvé</Text>
          ) : filtered.map(client => (
            <View key={client.id} style={styles.clientCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{client.firstName[0]}{client.lastName[0]}</Text>
              </View>
              <View style={styles.clientInfo}>
                <Text style={styles.clientName}>{client.firstName} {client.lastName}</Text>
                <Text style={styles.clientEmail}>{client.email}</Text>
                {client.phone && <Text style={styles.clientPhone}>📞 {client.phone}</Text>}
                <View style={styles.clientMeta}>
                  <Text style={styles.clientMetaText}>📅 Inscrit le {formatDate(client.createdAt)}</Text>
                  <Text style={styles.clientMetaText}>📋 {client._count.reservations} résa</Text>
                </View>
              </View>
            </View>
          ))}
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
  count: { color: Colors.primary, fontWeight: '700', fontSize: 13 },
  searchBox: { padding: 16, paddingBottom: 8 },
  searchInput: { backgroundColor: '#1E1E30', borderRadius: 12, padding: 14, color: Colors.white, fontSize: 14 },
  content: { padding: 16, gap: 10, paddingBottom: 40 },
  clientCard: { flexDirection: 'row', backgroundColor: '#1E1E30', borderRadius: 14, padding: 14, gap: 14, alignItems: 'flex-start' },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  clientInfo: { flex: 1, gap: 2 },
  clientName: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  clientEmail: { color: Colors.gray, fontSize: 13 },
  clientPhone: { color: Colors.gray, fontSize: 12 },
  clientMeta: { flexDirection: 'row', gap: 12, marginTop: 6 },
  clientMetaText: { color: '#A78BFA', fontSize: 11 },
});
