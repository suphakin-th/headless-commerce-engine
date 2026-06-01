import React, { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
} from 'react-native';
import { useCartStore } from '../store/cart';

export default function CartScreen() {
  const { cart, fetchCart, removeItem } = useCartStore();

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const handleRemove = (productId: string, productName: string) => {
    Alert.alert('Remove item', `Remove ${productName} from cart?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeItem(productId) },
    ]);
  };

  if (cart.items.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Your cart is empty</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={cart.items}
        keyExtractor={(item) => item.productId}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Image source={{ uri: item.product.imageUrl }} style={styles.image} />
            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={2}>{item.product.name}</Text>
              <Text style={styles.qty}>Qty: {item.quantity}</Text>
              <Text style={styles.subtotal}>${(item.product.price * item.quantity).toFixed(2)}</Text>
            </View>
            <TouchableOpacity onPress={() => handleRemove(item.productId, item.product.name)}>
              <Text style={styles.remove}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
        ListFooterComponent={
          <View style={styles.footer}>
            <Text style={styles.total}>Total: ${cart.total.toFixed(2)}</Text>
            <Text style={styles.note}>Complete checkout on the web storefront</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#6b7280' },
  list: { padding: 16, gap: 12 },
  item: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', gap: 12 },
  image: { width: 64, height: 64, borderRadius: 8, backgroundColor: '#f3f4f6' },
  info: { flex: 1 },
  name: { fontWeight: '600', color: '#111827', fontSize: 14 },
  qty: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  subtotal: { fontWeight: '700', color: '#2563eb', marginTop: 4 },
  remove: { color: '#ef4444', fontSize: 18, padding: 4 },
  footer: { marginTop: 20, padding: 16, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  total: { fontSize: 20, fontWeight: '800', color: '#111827', textAlign: 'center' },
  note: { marginTop: 8, fontSize: 13, color: '#9ca3af', textAlign: 'center' },
});
