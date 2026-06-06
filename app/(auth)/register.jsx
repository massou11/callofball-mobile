import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { Colors } from '../../src/constants/colors';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '' });
  const [loading, setLoading] = useState(false);

  const set = (key) => (val) => setForm(f => ({ ...f, [key]: val }));

  async function handleRegister() {
    if (!form.firstName || !form.lastName || !form.email || !form.password) {
      return Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires.');
    }
    setLoading(true);
    try {
      await register({ ...form, email: form.email.trim().toLowerCase() });
      router.replace('/(tabs)');
    } catch (e) {
      Alert.alert('Erreur', e.response?.data?.error || 'Inscription impossible');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>← Retour</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Créer un compte</Text>
      <Text style={styles.subtitle}>Rejoignez la communauté Call of Ball</Text>

      <View style={styles.row}>
        <View style={styles.half}>
          <Text style={styles.label}>Prénom *</Text>
          <TextInput style={styles.input} placeholder="Jordan" placeholderTextColor={Colors.gray} value={form.firstName} onChangeText={set('firstName')} />
        </View>
        <View style={styles.half}>
          <Text style={styles.label}>Nom *</Text>
          <TextInput style={styles.input} placeholder="Dupont" placeholderTextColor={Colors.gray} value={form.lastName} onChangeText={set('lastName')} />
        </View>
      </View>

      <Text style={styles.label}>Email *</Text>
      <TextInput style={styles.input} placeholder="votre@email.com" placeholderTextColor={Colors.gray} value={form.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" />

      <Text style={styles.label}>Téléphone</Text>
      <TextInput style={styles.input} placeholder="06 XX XX XX XX" placeholderTextColor={Colors.gray} value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" />

      <Text style={styles.label}>Mot de passe *</Text>
      <TextInput style={styles.input} placeholder="••••••••" placeholderTextColor={Colors.gray} value={form.password} onChangeText={set('password')} secureTextEntry />

      <TouchableOpacity style={styles.btn} onPress={handleRegister} disabled={loading}>
        <Text style={styles.btnText}>{loading ? 'Inscription...' : 'Créer mon compte'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
        <Text style={styles.link}>Déjà un compte ? <Text style={styles.linkBold}>Se connecter</Text></Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.secondary },
  content: { padding: 32, paddingTop: 80, gap: 12 },
  back: { marginBottom: 16 },
  backText: { color: Colors.gray, fontSize: 16 },
  title: { fontSize: 32, fontWeight: '800', color: Colors.white, marginBottom: 4 },
  subtitle: { fontSize: 16, color: Colors.gray, marginBottom: 16 },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1, gap: 4 },
  label: { color: Colors.white, fontWeight: '600', fontSize: 14 },
  input: { backgroundColor: '#2A2A3E', color: Colors.white, borderRadius: 12, padding: 16, fontSize: 16, borderWidth: 1, borderColor: '#3A3A5E' },
  btn: { backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  btnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  link: { color: Colors.gray, textAlign: 'center', fontSize: 14, marginTop: 8 },
  linkBold: { color: Colors.primary, fontWeight: '700' },
});
