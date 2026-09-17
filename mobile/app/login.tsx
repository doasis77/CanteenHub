import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/store/auth';

export default function LoginScreen() {
  const [email, setEmail] = useState('student@canteen.edu');
  const [password, setPassword] = useState('password123');
  const login = useAuth((s) => s.login);
  const router = useRouter();

  const handleLogin = async () => {
    try {
      await login(email, password);
      router.back();
    } catch (e) {
      Alert.alert('Login failed', e instanceof Error ? e.message : 'Unknown error');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome back</Text>
      <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
      <TouchableOpacity style={styles.btn} onPress={handleLogin}>
        <Text style={styles.btnText}>Sign In</Text>
      </TouchableOpacity>
      <Text style={styles.hint}>Demo: student@canteen.edu / password123</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fffbf7' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 24, color: '#1e293b' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, marginBottom: 12, fontSize: 16 },
  btn: { backgroundColor: '#ea580c', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  hint: { marginTop: 16, textAlign: 'center', color: '#94a3b8', fontSize: 12 },
});
