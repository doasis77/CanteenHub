import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { api } from '@/lib/api';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['loyalty'],
    queryFn: () => api.loyalty(),
    enabled: !!user,
  });

  if (!user) {
    return (
      <View style={styles.center}>
        <TouchableOpacity style={styles.btn} onPress={() => router.push('/login')}>
          <Text style={styles.btnText}>Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{user.fullName}</Text>
      <Text style={styles.email}>{user.email}</Text>

      {isLoading ? (
        <ActivityIndicator color="#ea580c" style={{ marginTop: 20 }} />
      ) : data && (
        <View style={styles.pointsCard}>
          <Text style={styles.pointsLabel}>Loyalty Points</Text>
          <Text style={styles.points}>{data.balance}</Text>
          <Text style={styles.tier}>{data.tier} Tier</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.btn, { backgroundColor: '#ef4444', marginTop: 32 }]}
        onPress={async () => { await logout(); router.replace('/'); }}
      >
        <Text style={styles.btnText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fffbf7' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 24, fontWeight: '700', color: '#1e293b' },
  email: { color: '#64748b', marginTop: 4 },
  pointsCard: { marginTop: 24, backgroundColor: '#fff7ed', padding: 24, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#fed7aa' },
  pointsLabel: { color: '#c2410c', fontSize: 14 },
  points: { fontSize: 48, fontWeight: '700', color: '#ea580c' },
  tier: { color: '#92400e', fontWeight: '600', marginTop: 4 },
  btn: { backgroundColor: '#ea580c', padding: 16, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
