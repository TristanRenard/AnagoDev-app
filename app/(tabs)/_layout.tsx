import { Ionicons } from "@expo/vector-icons"
import { Tabs } from "expo-router"

const TabLayout = () => (
  <Tabs screenOptions={{ headerShown: false }}>
    <Tabs.Screen
      name="index"
      options={{
        title: 'Accueil',
        tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} />,
      }}
    />
    <Tabs.Screen
      name="products"
      options={{
        title: 'Produits',
        tabBarIcon: ({ color }) => <Ionicons name="grid" size={24} color={color} />,
      }}
    />
  </Tabs>
)

export default TabLayout