import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useState } from "react";
import { ActivityIndicator, FlatList, Text, View } from "react-native";

const Orders = () => {
  const [userOrders, setUserOrders] = useState(null);

  const { isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const res = await axios.get("/api/user/orders");
      setUserOrders(res.data.orders);
    },
  });

  if (isLoading || !userOrders) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#6D28D9" />
        <Text className="mt-2 text-base text-gray-500">{"Loading..."}</Text>
      </View>
    );
  }

  const renderOrder = ({ item, index }) => {
    const totalPrice =
      item.orderPrices.reduce((acc, orderPrice) => acc + orderPrice.price.unit_amount * orderPrice.quantity, 0) / 100;

    const formattedDate = new Date(item.createdAt).toLocaleDateString();

    return (
      <View className="bg-gray-100 rounded-xl p-4 mb-4 shadow-sm">
        <View className="flex-row justify-between mb-1">
          <Text className="text-sm font-medium text-gray-600">
            {"Order"} #{index + 1}
          </Text>
          <Text className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{formattedDate}</Text>
        </View>
        <Text className="text-lg font-semibold text-gray-900">{totalPrice.toFixed(2)} €</Text>
        <Text className="text-sm text-gray-500 mt-1">
          {item.totalQuantity} {"items"}
        </Text>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-white p-4">
      <Text className="text-xl font-semibold text-gray-800 mb-4">
        {"My Orders"} ({userOrders.length})
      </Text>
      <FlatList
        data={userOrders}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderOrder}
        contentContainerStyle={{ paddingBottom: 16 }}
      />
    </View>
  );
};

export default Orders;
