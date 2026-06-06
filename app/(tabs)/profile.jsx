import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { Colors } from '../../src/constants/colors';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  function handleLogout() {
    Alert.alert('Déconnexion', 'Êtes-vous sûr de vouloir vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Déconnexion', style: 'destructive', onPress: async () => { await logout(); router.replace('/(auth)/welcome'); } },
    ]);
  }

  const initial = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mon profil</Text>

      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initial}</Text>
      </View>
      <Text style={styles.name}>{user?.firstName} {user?.lastName}</Text>
      <Text style={styles.email}>{user?.email}</Text>

      {user?.role === 'ADMIN' && (
        <View style={styles.adminBadge}>
          <Text style={styles.adminText}>⚙️ Administrateur</Text>
        </View>
      )}

      <View style={styles.section}>
        <InfoRow label="Prénom" value={user?.firstName} />
        <InfoRow label="Nom" value={user?.lastName} />
        <InfoRow label="Email" value={user?.email} />
        {user?.phone && <InfoRow label="Téléphone" value={user.phone} />}
      </View>

      <View style={styles.links}>
        <TouchableOpacity style={styles.link} onPress={() => router.push('/(tabs)/reservations')}>
          <Text style={styles.linkText}>📋 Mes réservations</Text>
          <Text style={styles.arrow}>→</Text>
        </TouchableOpacity>
      </View>

      {user?.role === 'ADMIN' && (
        <TouchableOpacity style={styles.adminBtn} onPress={() => router.push('/admin')}>
          <Text style={styles.adminBtnText}>⚙️ Tableau de bord Admin</Text>
          <Text style={styles.arrow}>→</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </TouchableOpacity>
    </View>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.secondary, padding: 24, paddingTop: 56, gap: 16 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.white },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginTop: 8 },
  avatarText: { color: Colors.white, fontSize: 28, fontWeight: '800' },
  name: { color: Colors.white, fontSize: 22, fontWeight: '700', textAlign: 'center' },
  email: { color: Colors.gray, textAlign: 'center', fontSize: 14 },
  adminBadge: { backgroundColor: Colors.primaryLight, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, alignSelf: 'center' },
  adminText: { color: Colors.primaryDark, fontWeight: '700', fontSize: 13 },
  section: { backgroundColor: '#1E1E30', borderRadius: 16, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#2A2A3E' },
  infoLabel: { color: Colors.gray, fontSize: 14 },
  infoValue: { color: Colors.white, fontWeight: '600', fontSize: 14 },
  links: { backgroundColor: '#1E1E30', borderRadius: 16, overflow: 'hidden' },
  link: { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  linkText: { color: Colors.white, fontSize: 15 },
  arrow: { color: Colors.gray },
  adminBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  adminBtnText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  logoutBtn: { borderWidth: 1.5, borderColor: Colors.error, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  logoutText: { color: Colors.error, fontWeight: '700', fontSize: 15 },
});
