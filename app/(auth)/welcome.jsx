import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { StatusBar } from 'expo-status-bar';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.hero}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>🏀</Text>
        </View>
        <Text style={styles.title}>Call of Ball</Text>
        <Text style={styles.subtitle}>Réservez votre terrain, vivez le jeu.</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.btnPrimary} onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.btnPrimaryText}>Se connecter</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnSecondary} onPress={() => router.push('/(auth)/register')}>
          <Text style={styles.btnSecondaryText}>Créer un compte</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.secondary, justifyContent: 'space-between', padding: 32 },
  hero: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  logoContainer: { width: 100, height: 100, borderRadius: 50, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  logoText: { fontSize: 50 },
  title: { fontSize: 40, fontWeight: '800', color: Colors.white, letterSpacing: 1 },
  subtitle: { fontSize: 16, color: Colors.gray, textAlign: 'center' },
  actions: { gap: 12, paddingBottom: 16 },
  btnPrimary: { backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  btnPrimaryText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  btnSecondary: { borderWidth: 1.5, borderColor: Colors.gray, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  btnSecondaryText: { color: Colors.white, fontSize: 16, fontWeight: '600' },
});
