import { Tabs } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { Text } from 'react-native';

function Icon({ emoji, focused }) {
  return <Text style={{ fontSize: focused ? 24 : 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: Colors.secondary, borderTopColor: '#2A2A3E', height: 70, paddingBottom: 10 },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.gray,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Accueil', tabBarIcon: ({ focused }) => <Icon emoji="🏠" focused={focused} /> }}
      />
      <Tabs.Screen
        name="book"
        options={{ title: 'Réserver', tabBarIcon: ({ focused }) => <Icon emoji="🏀" focused={focused} /> }}
      />
      <Tabs.Screen
        name="reservations"
        options={{ title: 'Mes résa', tabBarIcon: ({ focused }) => <Icon emoji="📋" focused={focused} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profil', tabBarIcon: ({ focused }) => <Icon emoji="👤" focused={focused} /> }}
      />
    </Tabs>
  );
}
