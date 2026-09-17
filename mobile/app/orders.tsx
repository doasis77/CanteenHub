import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Link } from 'expo-router';

export default function OrdersScreen() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['orders'],
    queryFn: () => api.orders.list(),
    refetchInterval: 10000,
  });

  if (isLoading) return <ActivityIndicator style={{ marginTop: 40 }} color="#ea580c" />;

  return (
    <FlatList
      data={data?.orders || []}
      keyExtractor={(o) => o.id}
      onRefresh={refetch}
      refreshing={isLoading}
      contentContainerStyle={{ padding: 16, gap: 10 }}
      ListEmptyComponent={<Text style={styles.empty}>No orders yet</Text>}
      renderItem={({ item }) => (
        <Link href={`/orders/${item.id}`} asChild>
          <TouchableOpacity style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.id}>#{item.id.slice(0, 8)}</Text>
              <Text style={styles.status}>{item.status.replace(/_/g, ' ')}</Text>
            </View>
            <Text style={styles.date}>{new Date(item.createdAt).toLocaleString()}</Text>
            <Text style={styles.total}>${Number(item.totalAmount).toFixed(2)}</Text>
          </TouchableOpacity>
        </Link>
      )}
    />
  );
}

const styles = StyleSheet.create({
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 40 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#fed7aa' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  id: { fontWeight: '700' },
  status: { fontSize: 12, color: '#ea580c', fontWeight: '600', textTransform: 'capitalize' },
  date: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
  total: { fontWeight: '700', color: '#ea580c', marginTop: 8 },
});
