import { Ionicons } from "@expo/vector-icons"
import { BlurView } from 'expo-blur'
import { Tabs } from "expo-router"
import { Platform, View } from 'react-native'

const TabLayout = () => {
  // Couleurs principales de l'application
  const purpleTheme = {
    primary: '#9333ea', // Violet principal
    secondary: '#a855f7', // Violet plus clair
    light: '#f3e8ff', // Violet très clair pour les fonds
    inactive: '#6b7280', // Gris pour les icônes inactives
    background: '#ffffff', // Fond blanc
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: purpleTheme.primary,
        tabBarInactiveTintColor: purpleTheme.inactive,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginBottom: 4,
        },
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 88 : 70,
          backgroundColor: purpleTheme.background,
          borderTopWidth: 0,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          paddingHorizontal: 8,
        },
        tabBarItemStyle: {
          padding: 4,
          height: 50,
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
        // Effet "floating tabs" avec un fond légèrement arrondi
        tabBarBackground: () => (
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              top: 0,
              backgroundColor: purpleTheme.background,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 8,
              overflow: 'hidden',
            }}
          >
            {/* Utilisation de BlurView sur iOS pour un effet de verre dépoli */}
            {Platform.OS === 'ios' && (
              <BlurView
                intensity={60}
                tint="light"
                style={{ flex: 1 }}
              />
            )}
          </View>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, focused }) => (
            <View style={{
              padding: 6,
              borderRadius: 12,
              backgroundColor: focused ? purpleTheme.light : 'transparent',
              width: 36,
              height: 36,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Ionicons
                name={focused ? "home" : "home-outline"}
                size={24}
                color={color}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Produits',
          tabBarIcon: ({ color, focused }) => (
            <View style={{
              padding: 6,
              borderRadius: 12,
              backgroundColor: focused ? purpleTheme.light : 'transparent',
              width: 36,
              height: 36,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Ionicons
                name={focused ? "grid" : "grid-outline"}
                size={24}
                color={color}
              />
            </View>
          ),
        }}
      />
    </Tabs>
  )
}

export default TabLayout