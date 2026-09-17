import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useRouter } from 'expo-router';

export default function CartScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['cart'], queryFn: () => api.cart.get() });

  const placeOrder = async () => {
    try {
      await api.orders.create();
      qc.invalidateQueries({ queryKey: ['cart'] });
      Alert.alert('Success', 'Order placed!', [{ text: 'OK', onPress: () => router.push('/orders') }]);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed');
    }
  };

  if (isLoading) return <ActivityIndicator style={{ marginTop: 40 }} color="#ea580c" />;

  if (!data?.items.length) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyEmoji}>🛒</Text>
        <Text style={styles.emptyText}>Your cart is empty</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={data.items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.emoji}>{item.menuItem.emoji || '🍽️'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.menuItem.name}</Text>
              <Text style={styles.qty}>Qty: {item.quantity}</Text>
            </View>
            <Text style={styles.price}>${(Number(item.menuItem.price) * item.quantity).toFixed(2)}</Text>
          </View>
        )}
      />
      <View style={styles.footer}>
        <Text style={styles.total}>Total: ${data.summary.total}</Text>
        <TouchableOpacity style={styles.btn} onPress={placeOrder}>
          <Text style={styles.btnText}>Place Order</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fffbf7' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 18, color: '#64748b', marginTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 14, borderRadius: 12, marginBottom: 8, gap: 12 },
  emoji: { fontSize: 28 },
  name: { fontWeight: '600' },
  qty: { color: '#94a3b8', fontSize: 13 },
  price: { fontWeight: '700', color: '#ea580c' },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: '#fed7aa', backgroundColor: '#fff' },
  total: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  btn: { backgroundColor: '#ea580c', padding: 16, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
