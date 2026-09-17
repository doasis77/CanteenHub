import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api, MenuItem } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { Link } from 'expo-router';

export default function MenuScreen() {
  const user = useAuth((s) => s.user);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['menu'],
    queryFn: () => api.menu(),
  });

  const addToCart = async (item: MenuItem) => {
    if (!user) {
      Alert.alert('Login required', 'Please log in to add items to cart');
      return;
    }
    try {
      await api.cart.add(item.id);
      Alert.alert('Added', `${item.name} added to cart`);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed');
    }
  };

  const renderItem = ({ item }: { item: MenuItem }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.emoji}>{item.emoji || '🍽️'}</Text>
        <View style={styles.cardInfo}>
          <Text style={styles.name}>{item.name}</Text>
          {item.description && <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>}
          <Text style={styles.meta}>~{item.prepTimeMinutes} min</Text>
        </View>
        <Text style={styles.price}>${Number(item.price).toFixed(2)}</Text>
      </View>
      {item.isSpecial && <Text style={styles.special}>⭐ Today&apos;s Special</Text>}
      <TouchableOpacity
        style={[styles.addBtn, !item.available && styles.disabled]}
        disabled={!item.available}
        onPress={() => addToCart(item)}
      >
        <Text style={styles.addBtnText}>{item.available ? '+ Add' : 'Sold Out'}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.nav}>
        <Link href="/cart" asChild>
          <TouchableOpacity style={styles.navBtn}><Text style={styles.navText}>🛒 Cart</Text></TouchableOpacity>
        </Link>
        <Link href="/orders" asChild>
          <TouchableOpacity style={styles.navBtn}><Text style={styles.navText}>📦 Orders</Text></TouchableOpacity>
        </Link>
        <Link href={user ? '/profile' : '/login'} asChild>
          <TouchableOpacity style={styles.navBtn}>
            <Text style={styles.navText}>{user ? '👤 Profile' : '🔑 Login'}</Text>
          </TouchableOpacity>
        </Link>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#ea580c" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={data?.items || []}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          onRefresh={refetch}
          refreshing={isLoading}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          ListHeaderComponent={
            data?.specials?.length ? (
              <Text style={styles.sectionTitle}>⭐ Today&apos;s Specials</Text>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fffbf7' },
  nav: { flexDirection: 'row', padding: 12, gap: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#fed7aa' },
  navBtn: { flex: 1, backgroundColor: '#fff7ed', padding: 10, borderRadius: 10, alignItems: 'center' },
  navText: { fontWeight: '600', color: '#c2410c', fontSize: 13 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#c2410c', marginBottom: 8 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#fed7aa' },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  emoji: { fontSize: 36 },
  cardInfo: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  desc: { fontSize: 13, color: '#64748b', marginTop: 2 },
  meta: { fontSize: 11, color: '#94a3b8', marginTop: 4 },
  price: { fontSize: 16, fontWeight: '700', color: '#ea580c' },
  special: { fontSize: 12, color: '#ea580c', fontWeight: '600', marginTop: 8 },
  addBtn: { marginTop: 12, backgroundColor: '#ea580c', padding: 12, borderRadius: 10, alignItems: 'center' },
  addBtnText: { color: '#fff', fontWeight: '700' },
  disabled: { backgroundColor: '#cbd5e1' },
});
