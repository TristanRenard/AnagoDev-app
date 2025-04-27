import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import axios, { AxiosError } from "axios"
import Constants from "expo-constants"
import { useRouter } from "expo-router"
import { LoaderCircle, Minus, Plus, ShoppingCart } from "lucide-react-native"
import { useEffect, useState } from "react"
import { Alert, Image, ScrollView as RNScrollView, Text, TouchableOpacity, View } from "react-native"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { SafeAreaView } from "react-native-safe-area-context"

const url = Constants.expoConfig?.extra?.apiUrl as string

// Types
interface ProductPrice {
  unit_amount: number
}

interface ProductQuantity {
  quantity: number
}

interface Product {
  id: string
  title: string
  images: string[]
  default_price: string
}

interface CartData {
  orderPrice: ProductPrice[]
  quantity: ProductQuantity[]
  allProducts: Product[]
}

interface UserData {
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
}

interface CartMutationVariables {
  selectedPrice: string
  action: "add" | "remove"
}

const CartPage = () => {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [user, setUser] = useState<UserData["user"] | null>(null)

  // Vérifier si l'utilisateur est connecté
  useEffect(() => {
    const checkUserAuth = async () => {
      try {
        const res = await axios.get<UserData>(`${url}/api/me`)
        setUser(res.data.user)
      } catch (error) {
        // Rediriger vers la page de connexion si l'utilisateur n'est pas connecté
        router.push("/auth/login")
      }
    }

    checkUserAuth()
  }, [router])

  // Récupérer les données du panier
  const { data, isLoading, isError } = useQuery<CartData>({
    queryKey: ["cart"],
    queryFn: async () => {
      try {
        const res = await axios.get<CartData>(`${url}/api/cart`)
        return res.data
      } catch (error) {
        const axiosError = error as AxiosError
        if (axiosError.response?.status === 401) {
          router.push("/auth/login")
        }
        throw error
      }
    },
  })

  // Mutation pour ajouter/supprimer des produits du panier
  const addProductMutation = useMutation<unknown, AxiosError, CartMutationVariables>({
    mutationFn: async ({ selectedPrice, action = "add" }) => {
      const res = await axios.post(`${url}/api/cart`, {
        selectedPrice,
        action,
      })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] })
    },
    onError: (error) => {
      console.error("Error adding product to cart:", error)
      Alert.alert(
        "Erreur",
        // @ts-ignore
        error.response?.data?.message as string || "Une erreur est survenue"
      )
    },
  })

  // Gérer la mise à jour de la quantité
  const handleUpdateQuantity = (selectedPriceId: string, action: "add" | "remove") => {
    addProductMutation.mutate({ selectedPrice: selectedPriceId, action })
  }

  // Calculer le total du panier
  const calculateTotal = (): number => {
    if (!data) {
      return 0
    }

    return (
      data.orderPrice.reduce(
        (acc, { unit_amount }, index) =>
          acc + unit_amount * data.quantity[index].quantity,
        0
      ) / 100
    )
  }

  // Gérer le paiement
  const handlePayment = async () => {
    try {
      if (!data) return

      const res = await axios.post(`${url}/api/payment`, {
        products: data.allProducts,
        quantity: data.quantity,
      })

      // Rediriger vers la page de paiement
      router.push({
        pathname: "/payment",
        params: { url: res.data.url, headerShown: false },
      } as any)
    } catch (error) {
      const axiosError = error as AxiosError
      console.error("Error during payment:", axiosError)
      Alert.alert(
        "Erreur",
        (axiosError.response?.data as any)?.message || "Une erreur est survenue lors du traitement du paiement"
      )
    }
  }

  // Afficher un écran de chargement si l'utilisateur n'est pas encore vérifié
  if (!user && !isError) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-gray-50">
        <LoaderCircle size={30} color="#7C3AED" />
        <Text className="mt-4 text-gray-600">Vérification de la connexion...</Text>
      </SafeAreaView>
    )
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView edges={['top']} className="flex-1 bg-gray-50">
        <View className="px-4 py-3 border-b border-gray-200 bg-white">
          <Text className="text-2xl font-bold text-gray-900">Panier</Text>
        </View>

        {isLoading && (
          <View className="flex-1 justify-center items-center">
            <LoaderCircle size={30} color="#7C3AED" />
            <Text className="mt-4 text-gray-600">Chargement de votre panier...</Text>
          </View>
        )}

        {isError && (
          <View className="flex-1 justify-center items-center">
            <Text className="text-red-500">Erreur lors du chargement du panier</Text>
            <TouchableOpacity
              className="mt-4 bg-purple-600 py-2 px-4 rounded-lg"
              onPress={() => queryClient.invalidateQueries({ queryKey: ["cart"] })}
            >
              <Text className="text-white font-medium">Réessayer</Text>
            </TouchableOpacity>
          </View>
        )}

        {data && data.orderPrice.length === 0 ? (
          <View className="flex-1 justify-center items-center p-4">
            <ShoppingCart size={48} color="#6B7280" />
            <Text className="mt-4 text-gray-500 text-lg text-center">
              Votre panier est vide
            </Text>
            <TouchableOpacity
              className="mt-6 bg-purple-600 py-3 px-6 rounded-xl"
              onPress={() => router.push("/products" as any)}
            >
              <Text className="text-white font-bold">Découvrir nos produits</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="mt-4 bg-gray-200 py-2 px-4 rounded-lg"
              onPress={() => queryClient.invalidateQueries({ queryKey: ["cart"] })}
            >
              <Text className="text-gray-700 font-medium">
                Raffraîchir
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          data && (
            <View className="flex-1">
              <RNScrollView className="flex-1 p-4">
                <View className="flex flex-col gap-4">
                  {data.allProducts.map((product, index) => (
                    <View
                      key={product.id}
                      className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm"
                    >
                      <View className="flex-row">
                        <Image
                          source={{ uri: `${url}${product.images[0]}` }}
                          style={{ width: 96, height: 96, borderRadius: 8 }}
                          resizeMode="cover"
                        />
                        <View className="ml-4 flex-1 justify-between">
                          <Text className="text-base font-semibold text-gray-800">
                            {product.title}
                          </Text>
                          <Text className="text-sm text-gray-500">
                            {data.quantity[index].quantity} × {data.orderPrice[index].unit_amount / 100} €
                          </Text>

                          <View className="flex-row items-center mt-2">
                            <TouchableOpacity
                              onPress={() => handleUpdateQuantity(product.default_price, "remove")}
                              disabled={addProductMutation.isPending}
                              className="w-8 h-8 rounded-full border border-gray-300 items-center justify-center bg-gray-50"
                            >
                              <Minus size={16} color="#4B5563" />
                            </TouchableOpacity>

                            <Text className="mx-3 text-base font-medium text-gray-800">
                              {data.quantity[index].quantity}
                            </Text>

                            <TouchableOpacity
                              onPress={() => handleUpdateQuantity(product.default_price, "add")}
                              disabled={addProductMutation.isPending}
                              className="w-8 h-8 rounded-full border border-gray-300 items-center justify-center bg-gray-50"
                            >
                              <Plus size={16} color="#4B5563" />
                            </TouchableOpacity>

                            <Text className="ml-auto text-lg font-semibold text-gray-800">
                              {((data.orderPrice[index].unit_amount * data.quantity[index].quantity) / 100).toFixed(2)} €
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </RNScrollView>

              <View className="p-4 bg-white border-t border-gray-200">
                <View className="flex-row justify-between items-center mb-4">
                  <Text className="text-lg text-gray-700 font-medium">Total</Text>
                  <Text className="text-xl text-gray-900 font-bold">
                    {calculateTotal().toFixed(2)} €
                  </Text>
                </View>

                <TouchableOpacity
                  className="bg-purple-600 py-3 rounded-xl flex-row justify-center items-center"
                  onPress={handlePayment}
                  disabled={addProductMutation.isPending}
                >
                  {addProductMutation.isPending ? (
                    <LoaderCircle size={24} color="#FFFFFF" />
                  ) : (
                    <>
                      <ShoppingCart size={20} color="#FFFFFF" />
                      <Text className="ml-2 text-white font-bold text-base">
                        Passer au paiement
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
  )
}

export default CartPage