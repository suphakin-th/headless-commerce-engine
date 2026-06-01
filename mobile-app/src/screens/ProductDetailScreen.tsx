import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { Product } from '@shared/types';
import { api } from '../lib/api';
import { useCartStore } from '../store/cart';
import type { RootStackParamList } from '../navigation';

interface Props {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ProductDetail'>;
  route: RouteProp<RootStackParamList, 'ProductDetail'>;
}

export default function ProductDetailScreen({ navigation, route }: Props) {
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const { addItem } = useCartStore();

  useEffect(() => {
    api.products.get(route.params.productId).then(setProduct);
  }, [route.params.productId]);

  const handleAddToCart = async () => {
    if (!product) return;
    setAdding(true);
    try {
      await addItem(product.id, quantity);
      Alert.alert('Added to cart', `${product.name} × ${quantity}`, [
        { text: 'Keep shopping' },
        { text: 'View cart', onPress: () => navigation.navigate('Cart') },
      ]);
    } catch (err) {
      Alert.alert('Error', (err as Error).message);
    } finally {
      setAdding(false);
    }
  };

  if (!product) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <ScrollView>
      <Image source={{ uri: product.imageUrl }} style={styles.image} />
      <View style={styles.content}>
        <Text style={styles.name}>{product.name}</Text>
        <Text style={styles.price}>${product.price.toFixed(2)}</Text>
        <Text style={styles.stock}>
          {product.inventory > 0 ? `${product.inventory} in stock` : 'Out of stock'}
        </Text>
        <Text style={styles.description}>{product.description}</Text>

        <View style={styles.qtyRow}>
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => setQuantity((q) => Math.max(1, q - 1))}
          >
            <Text style={styles.qtyBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.qty}>{quantity}</Text>
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => setQuantity((q) => Math.min(product.inventory, q + 1))}
          >
            <Text style={styles.qtyBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.addBtn, (adding || product.inventory === 0) && styles.disabled]}
          onPress={handleAddToCart}
          disabled={adding || product.inventory === 0}
        >
          <Text style={styles.addBtnText}>
            {adding ? 'Adding...' : product.inventory === 0 ? 'Out of Stock' : 'Add to Cart'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  image: { width: '100%', aspectRatio: 1, backgroundColor: '#f3f4f6' },
  content: { padding: 20 },
  name: { fontSize: 22, fontWeight: '700', color: '#111827' },
  price: { fontSize: 28, fontWeight: '800', color: '#2563eb', marginTop: 8 },
  stock: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  description: { marginTop: 16, fontSize: 15, color: '#374151', lineHeight: 22 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 24, gap: 16 },
  qtyBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: '#d1d5db', justifyContent: 'center', alignItems: 'center' },
  qtyBtnText: { fontSize: 20, color: '#374151' },
  qty: { fontSize: 18, fontWeight: '600', minWidth: 30, textAlign: 'center' },
  addBtn: { marginTop: 20, backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  disabled: { opacity: 0.5 },
});
