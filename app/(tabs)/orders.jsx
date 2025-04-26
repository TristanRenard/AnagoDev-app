import { useQuery } from "@tanstack/react-query";
import Constants from "expo-constants";
import axios from "axios";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { View, Text, FlatList, ActivityIndicator, Alert } from "react-native";

const url = Constants.expoConfig?.extra?.apiUrl;

const OrdersScreen = () => {
  const navigation = useNavigation();
  const [orders, setOrders] = useState([]);

  const { isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      try {
        const res = await axios(`${url}/api/user/orders`);
        const formatted = res.data.orders.map((order) => ({
          id: order.id,
          status: order.status,
          createdAt: order.created_at,
          paymentMethod: order.paymentMethodId,
          stripeSessionId: order.stripeSessionId,
          products: order.orderPrices.map((op) => ({
            id: `${order.id}-${op.price?.id}`,
            quantity: op.quantity,
            price: op.price?.unit_amount,
            currency: op.price?.currency,
            productName: op.price?.product?.title,
          })),
        }));
        setOrders(formatted);
        return formatted;
      } catch (err) {
        Alert.alert("Session expired","You will be redirected to login", [
          {
            text: "OK",
            onPress: () => navigation.navigate("Login"),
          },
        ]);
        return [];
      }
    },
  });

  const renderProduct = ({ item }) => {
    const formattedPrice = item.price
      ? `${(item.price / 100).toFixed(2)} ${item.currency?.toUpperCase()}`
      : "Price not available";

    return (
      <Text className="ml-4 text-sm">
        {item.quantity} × {item.productName || "Unknown product"} ({formattedPrice})
      </Text>
    );
  };

  const renderItem = ({ item }) => (
    <View className="mb-4 p-4 border rounded border-gray-300 bg-white">
      <Text className="font-semibold">
        {"ID"}: <Text className="font-normal">{item.id}</Text>
      </Text>
      <Text className="font-semibold">
        {"Status"}: <Text className="font-normal">{item.status}</Text>
      </Text>
      <Text className="font-semibold">
        {"Date"}: <Text className="font-normal">{item.createdAt}</Text>
      </Text>
      <Text className="font-semibold">{"Products"}:</Text>
      <FlatList data={item.products} renderItem={renderProduct} keyExtractor={(product) => product.id} />
    </View>
  );

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator />
        <Text className="mt-2">{"Loading..."}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 p-4 bg-gray-50">
      <Text className="text-xl font-bold mb-4">{"Orders"}</Text>
      {orders.length === 0 ? (
        <Text>{"No orders found"}</Text>
      ) : (
        <FlatList data={orders} renderItem={renderItem} keyExtractor={(order) => order.id} />
      )}
    </View>
  );
};

export default OrdersScreen;
