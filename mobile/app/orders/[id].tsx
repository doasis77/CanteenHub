import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

const STEPS = ['PLACED', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'COMPLETED'];

export default function OrderTrackScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => api.orders.get(id),
    refetchInterval: 5000,
  });

  if (isLoading) return <ActivityIndicator style={{ marginTop: 40 }} color="#ea580c" />;
  if (!data) return <Text style={styles.empty}>Order not found</Text>;

  const current = STEPS.indexOf(data.order.status);

  return (
    <View style={styles.container}>
      {STEPS.map((step, i) => (
        <View key={step} style={styles.step}>
          <View style={[styles.dot, i <= current && styles.dotActive]} />
          <Text style={[styles.stepText, i <= current && styles.stepActive]}>
            {step.replace(/_/g, ' ')}
          </Text>
        </View>
      ))}
      {data.order.estimatedTime && (
        <Text style={styles.eta}>
          ETA: {new Date(data.order.estimatedTime).toLocaleTimeString()}
        </Text>
      )}
      <View style={styles.items}>
        {data.order.items.map((item, i) => (
          <Text key={i} style={styles.item}>{item.itemName} × {item.quantity}</Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fffbf7' },
  empty: { textAlign: 'center', marginTop: 40, color: '#94a3b8' },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  dot: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#e2e8f0' },
  dotActive: { backgroundColor: '#ea580c', borderColor: '#ea580c' },
  stepText: { color: '#94a3b8', textTransform: 'capitalize' },
  stepActive: { color: '#c2410c', fontWeight: '600' },
  eta: { textAlign: 'center', color: '#64748b', marginVertical: 16 },
  items: { marginTop: 16, backgroundColor: '#fff', padding: 16, borderRadius: 12 },
  item: { paddingVertical: 4, color: '#475569' },
});
