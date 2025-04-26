import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import Constants from "expo-constants";
import { Tabs } from "expo-router";
import { useEffect, useState } from "react";

const url = Constants.expoConfig?.extra?.apiUrl;

const TabLayout = () => {
  const [connected, setConnected] = useState(false);
  const isLogged = async () => {
    const res = await axios(`${url}/api/connection`);
    const { loggedIn } = res.data;

    setConnected(loggedIn);
  };

  useEffect(() => {
    isLogged();
  }, []);

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Accueil",
          tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: "Produits",
          tabBarIcon: ({ color }) => <Ionicons name="grid" size={24} color={color} />,
        }}
      />
      {connected ? (
        <>
          <Tabs.Screen
            name="profile"
            options={{
              title: "Profil",
              tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} />,
            }}
          />
          <Tabs.Screen
            name="orders"
            options={{
              title: "Commandes",
              tabBarIcon: ({ color }) => <Ionicons name="cart" size={24} color={color} />,
            }}
          />
        </>
      ) : (
        <Tabs.Screen
          name="login"
          options={{
            title: "Connexion",
            tabBarIcon: ({ color }) => <Ionicons name="log-in" size={24} color={color} />,
          }}
        />
      )}
    </Tabs>
  );
};

export default TabLayout;
