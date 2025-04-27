import { Ionicons } from "@expo/vector-icons"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Tabs } from "expo-router"

const queryClient = new QueryClient()

const TabLayout = () => (
  <QueryClientProvider client={queryClient}>
    <Tabs screenOptions={{ headerShown: false }} >
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
      <Tabs.Screen
        name="chatbot"
        options={{
          title: 'Chatbot',
          tabBarIcon: ({ color }) => <Ionicons name="chatbubble" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Panier',
          tabBarIcon: ({ color }) => <Ionicons name="cart" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="auth/account"
        options={{
          title: 'Compte',
          tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="auth/login"

        options={{
          href: null,
        }}
      />
    </Tabs>
  </QueryClientProvider>
)

export default TabLayout