import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { Protein } from '../../types/protein';
import { useEffect, useState } from 'react';
import { getProteins } from '../../services/recipeService';
import ProteinCard  from '../../components/ProteinCard';
import { Stack, useRouter } from 'expo-router';

export default function HomeScreen() {
  const [proteins, setProteins] = useState<Protein[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchProteins = async () => {
      const data = await getProteins();
      setProteins(data);
      setLoading(false);
    };

    fetchProteins();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="small" color="#007AFF" />
      </View>
    );
  }

  const handleProteinPress = (protein: Protein) => {
    console.log('Painettu:', protein.label);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerLargeTitle: true,
          headerLargeTitleShadowVisible: false,
          headerStyle: { backgroundColor: '#F2F2F7' },
          headerLargeTitleStyle: { color: '#000' },
          title: 'Ruoka-apuri'
        }}
      />
      <FlatList
        data={proteins}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <ProteinCard protein={item} onPress={() => handleProteinPress(item)} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  list: {
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});