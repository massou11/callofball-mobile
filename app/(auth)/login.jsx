import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { Colors } from '../../src/constants/colors';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) return Alert.alert('Erreur', 'Veuillez remplir tous les champs.');
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace('/(tabs)');
    } catch (e) {
      Alert.alert('Erreur', e.response?.data?.error || 'Identifiants incorrects');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>← Retour</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Connexion</Text>
      <Text style={styles.subtitle}>Heureux de vous revoir !</Text>

      <View style={styles.form}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="votre@email.com"
          placeholderTextColor={Colors.gray}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Mot de passe</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor={Colors.gray}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading}>
          <Text style={styles.btnText}>{loading ? 'Connexion...' : 'Se connecter'}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
        <Text style={styles.link}>Pas encore de compte ? <Text style={styles.linkBold}>S'inscrire</Text></Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.secondary, padding: 32, justifyContent: 'center' },
  back: { position: 'absolute', top: 56, left: 32 },
  backText: { color: Colors.gray, fontSize: 16 },
  title: { fontSize: 32, fontWeight: '800', color: Colors.white, marginBottom: 8 },
  subtitle: { fontSize: 16, color: Colors.gray, marginBottom: 32 },
  form: { gap: 12, marginBottom: 24 },
  label: { color: Colors.white, fontWeight: '600', fontSize: 14 },
  input: { backgroundColor: '#2A2A3E', color: Colors.white, borderRadius: 12, padding: 16, fontSize: 16, borderWidth: 1, borderColor: '#3A3A5E' },
  btn: { backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  btnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  link: { color: Colors.gray, textAlign: 'center', fontSize: 14 },
  linkBold: { color: Colors.primary, fontWeight: '700' },
});
