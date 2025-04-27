import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query"
import axios from "axios"
import Constants from 'expo-constants'
import { useRouter } from "expo-router"
import { LoaderCircle, LogOut, User } from "lucide-react-native"
import { useEffect, useState } from "react"
import { Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

const url = Constants.expoConfig?.extra?.apiUrl

// Types
interface UserType {
  firstName: string
  lastName: string
  email: string
  phone: string
}

interface UserAddressType {
  street?: string
  city?: string
  state?: string
  zip?: string
  country?: string
  complement?: string
  name?: string
  isDefault?: boolean
}

interface OrderPriceType {
  price: {
    unit_amount: number
  }
}

interface OrderType {
  id: string
  createdAt: string
  status: string
  orderPrices: OrderPriceType[]
}

interface RowProps {
  title: string
  value: string | boolean | null | undefined
  field: string
  editing: boolean
  onEdit: (field: string, value: string | boolean) => void
}

interface EditedFieldsType {
  [key: string]: string | boolean | undefined
}

// Component to display a row of user information
const Row = ({ title, value, field, editing, onEdit }: RowProps) => {
  const isPhoneField = field === "phone"
  const [inputValue, setInputValue] = useState(
    value === "-" || value === null || value === undefined ? "" : String(value)
  )

  useEffect(() => {
    setInputValue(
      value === "-" || value === null || value === undefined ? "" : String(value)
    )
  }, [value])

  return (
    <View className="flex-row py-3 border-b border-gray-200">
      <Text className="w-24 text-sm font-bold text-gray-600">{title}</Text>
      <View className="flex-1">
        {editing && field !== "email" ? (
          <TextInput
            className="border border-gray-300 rounded-lg p-2 text-sm bg-gray-50"
            value={inputValue}
            onChangeText={(text) => {
              setInputValue(text)
              onEdit(field, text)
            }}
            keyboardType={isPhoneField ? "phone-pad" : "default"}
          />
        ) : (
          <Text className="text-sm text-gray-800 py-2">{String(value || "-")}</Text>
        )}
      </View>
    </View>
  )
}

const Profile = () => {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<string>("profile")
  const [user, setUser] = useState<UserType | null>(null)
  const [userAddress, setUserAddress] = useState<UserAddressType | null>(null)
  const [userOrders, setUserOrders] = useState<OrderType[]>([])
  const [editing, setEditing] = useState<boolean>(false)
  const [modalVisible, setModalVisible] = useState<boolean>(false)
  const [editedFields, setEditedFields] = useState<EditedFieldsType>({})

  const queryClient = useQueryClient()

  // Fetch user data and orders
  const results = useQueries({
    queries: [
      {
        queryKey: ["user"],
        queryFn: async () => {
          try {
            const res = await axios.get(`${url}/api/me`)
            setUser(res.data.user)
            setUserAddress(res.data.userAddress[0] || null)
            return res.data
          } catch (error) {
            router.push("/auth/login")
            return null
          }
        },
      },
      {
        queryKey: ["orders"],
        queryFn: async () => {
          try {
            const res = await axios.get(`${url}/api/user/orders`)
            const filteredOrders = res.data.orders
              .filter((order: OrderType) => order.status === "paid")
              .reverse()
            setUserOrders(filteredOrders)
            return filteredOrders
          } catch (error) {
            console.error("Failed to fetch orders:", error)
            return []
          }
        },
      },
    ],
  })

  // Logout user
  const logoutUser = async () => {
    try {
      await axios.delete(`${url}/api/user/login`)

      // Reset data and redirect to login page
      setUser(null)
      setUserAddress(null)
      setUserOrders([])

      // Invalidate all queries to force data refresh
      queryClient.invalidateQueries()

      router.push("/auth/login")
    } catch (error) {
      Alert.alert("Erreur", "Une erreur est survenue lors de la déconnexion.")
    }
  }

  // Mutation to update user details
  const mutation = useMutation({
    mutationFn: async (modifiedFields: { field: string; editedValue: string | boolean }[]) => {
      await Promise.all(
        modifiedFields.map(({ field, editedValue }) =>
          axios.put(`${url}/api/user/modifyDetails`, { field, editedValue })
        )
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] })
      Alert.alert("Succès", "Vos informations ont été mises à jour.")
    },
    onError: () => {
      Alert.alert("Erreur", "Une erreur est survenue lors de la mise à jour de vos informations.")
    }
  })

  // Handle field edits
  const handleEdit = (field: string, value: string | boolean) => {
    setEditedFields((prev) => ({ ...prev, [field]: value }))
  }

  // Save all edited fields
  // Save all edited fields
  const handleSaveAll = () => {
    const modifiedFields = Object.entries(editedFields)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([field, editedValue]) => ({
        field,
        editedValue: editedValue as string | boolean
      }))

    if (modifiedFields.length > 0) {
      mutation.mutate(modifiedFields)
    }

    setEditing(false)
    setEditedFields({})
  }

  // Send account deletion email
  const sendAccountDeletionEmail = async () => {
    try {
      if (!user) return

      const res = await axios.post(`${url}/api/user/accountDeletion`, {
        email: user.email,
      })

      if (res.status === 200) {
        Alert.alert(
          "Succès",
          "Un email de confirmation de suppression de compte a été envoyé. Veuillez vérifier votre boîte de réception."
        )
        setModalVisible(false)
      }
    } catch (error) {
      Alert.alert("Erreur", "Une erreur est survenue lors de l'envoi de l'email.")
    }
  }

  if (!user) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 justify-center items-center bg-gray-100">
        <LoaderCircle size={32} color="#7C3AED" />
        <Text className="mt-3 text-base text-gray-600">Chargement...</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-gray-100">
      <ScrollView className="flex-1">
        <View className="p-4 pb-10">
          {/* Tabs */}
          <View className="flex-row border-b border-gray-200 mb-4">
            <TouchableOpacity
              onPress={() => setActiveTab("profile")}
              className={`px-4 py-2 mr-2 ${activeTab === "profile"
                ? "border-b-2 border-purple-700"
                : ""
                }`}
            >
              <Text
                className={`text-base font-medium ${activeTab === "profile"
                  ? "text-purple-700"
                  : "text-gray-500"
                  }`}
              >
                Profil
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab("orders")}
              className={`px-4 py-2 ${activeTab === "orders"
                ? "border-b-2 border-purple-700"
                : ""
                }`}
            >
              <Text
                className={`text-base font-medium ${activeTab === "orders"
                  ? "text-purple-700"
                  : "text-gray-500"
                  }`}
              >
                Mes commandes
              </Text>
            </TouchableOpacity>
          </View>

          {/* User Header */}
          <View className="flex-row items-center justify-between bg-white p-4 rounded-xl mb-4 shadow-sm">
            <View className="flex-row items-center">
              <View className="w-16 h-16 bg-purple-100 rounded-full justify-center items-center mr-4">
                <User size={32} color="#7C3AED" />
              </View>
              <View>
                <Text className="text-lg font-bold text-gray-900">
                  {user.firstName} {user.lastName}
                </Text>
                <Text className="text-sm text-gray-500">{user.email}</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={logoutUser}
              className="bg-gray-100 p-2 rounded-full"
            >
              <LogOut size={24} color="#EF4444" />
            </TouchableOpacity>
          </View>

          {activeTab === "profile" ? (
            <>
              {/* Personal Information */}
              <View className="bg-white p-4 rounded-xl mb-4 shadow-sm">
                <Text className="text-lg font-semibold mb-3 pb-2 border-b border-gray-200 text-gray-700">
                  Informations personnelles
                </Text>

                <View className="mb-2">
                  <Row
                    title="Prénom"
                    value={user.firstName}
                    field="firstName"
                    editing={editing}
                    onEdit={handleEdit}
                  />
                  <Row
                    title="Nom"
                    value={user.lastName}
                    field="lastName"
                    editing={editing}
                    onEdit={handleEdit}
                  />
                  <Row
                    title="Téléphone"
                    value={user.phone}
                    field="phone"
                    editing={editing}
                    onEdit={handleEdit}
                  />
                  <Row
                    title="Rue"
                    value={userAddress?.street}
                    field="street"
                    editing={editing}
                    onEdit={handleEdit}
                  />
                  <Row
                    title="Ville"
                    value={userAddress?.city}
                    field="city"
                    editing={editing}
                    onEdit={handleEdit}
                  />
                  <Row
                    title="État"
                    value={userAddress?.state}
                    field="state"
                    editing={editing}
                    onEdit={handleEdit}
                  />
                  <Row
                    title="Code postal"
                    value={userAddress?.zip}
                    field="zip"
                    editing={editing}
                    onEdit={handleEdit}
                  />
                  <Row
                    title="Pays"
                    value={userAddress?.country}
                    field="country"
                    editing={editing}
                    onEdit={handleEdit}
                  />
                  <Row
                    title="Complément"
                    value={userAddress?.complement}
                    field="complement"
                    editing={editing}
                    onEdit={handleEdit}
                  />
                  <Row
                    title="Nom"
                    value={userAddress?.name}
                    field="name"
                    editing={editing}
                    onEdit={handleEdit}
                  />
                  <Row
                    title="Par défaut"
                    value={userAddress?.isDefault ? "Oui" : "Non"}
                    field="isDefault"
                    editing={editing}
                    onEdit={handleEdit}
                  />
                </View>

                {!editing ? (
                  <TouchableOpacity
                    className="bg-purple-600 rounded-lg p-3 items-center mt-4"
                    onPress={() => setEditing(true)}
                  >
                    <Text className="text-white font-bold text-base">Modifier</Text>
                  </TouchableOpacity>
                ) : (
                  <View className="flex-row justify-between mt-4">
                    <TouchableOpacity
                      className="bg-green-600 rounded-lg p-3 flex-1 items-center mr-2"
                      onPress={handleSaveAll}
                      disabled={mutation.isPending}
                    >
                      {mutation.isPending ? (
                        <LoaderCircle size={20} color="#FFFFFF" />
                      ) : (
                        <Text className="text-white font-bold text-base">Enregistrer</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="bg-red-600 rounded-lg p-3 flex-1 items-center ml-2"
                      onPress={() => {
                        setEditing(false)
                        setEditedFields({})
                      }}
                      disabled={mutation.isPending}
                    >
                      <Text className="text-white font-bold text-base">Annuler</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Danger Zone */}
              <View className="bg-white p-4 rounded-xl mb-4 shadow-sm border-t-4 border-red-500">
                <Text className="text-lg font-semibold mb-2 text-red-600">
                  Zone dangereuse
                </Text>
                <Text className="text-sm text-gray-600 mb-4">
                  Supprimez votre compte définitivement ou déconnectez-vous.
                </Text>
                <View className="flex-col gap-4">
                  <TouchableOpacity
                    className="bg-red-500 rounded-lg p-3 items-center flex-1 "
                    onPress={() => setModalVisible(true)}
                  >
                    <Text className="text-white font-bold text-base">Supprimer mon compte</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="bg-gray-500 rounded-lg p-3 items-center flex-1 "
                    onPress={logoutUser}
                  >
                    <Text className="text-white font-bold text-base">Déconnexion</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Confirmation Modal */}
              <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
              >
                <View className="flex-1 justify-center items-center bg-black bg-opacity-50 p-4">
                  <View className="bg-white rounded-xl p-5 w-11/12 shadow-lg">
                    <Text className="text-lg font-bold text-gray-900 mb-2">
                      Êtes-vous absolument sûr ?
                    </Text>
                    <Text className="text-sm text-gray-600 mb-5">
                      Cette action ne peut pas être annulée. Cela supprimera définitivement
                      votre compte et toutes vos données de nos serveurs.
                    </Text>
                    <View className="flex-row justify-end">
                      <TouchableOpacity
                        className="py-2 px-4 mr-3"
                        onPress={() => setModalVisible(false)}
                      >
                        <Text className="text-gray-600 font-medium">Annuler</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="bg-red-500 rounded-lg py-2 px-4"
                        onPress={sendAccountDeletionEmail}
                      >
                        <Text className="text-white font-bold">Oui, supprimer</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Modal>
            </>
          ) : (
            // Orders Tab
            <View className="bg-white p-4 rounded-xl shadow-sm">
              <Text className="text-xl font-semibold text-gray-800 mb-4">
                Mes commandes ({userOrders.length})
              </Text>
              <View>
                {userOrders.length > 0 ? (
                  userOrders.map((order, index) => {
                    const totalPrice =
                      order.orderPrices.reduce(
                        (acc, orderPrice) => acc + orderPrice.price.unit_amount,
                        0
                      ) / 100
                    const formattedDate = new Date(
                      order.createdAt
                    ).toLocaleDateString()

                    return (
                      <View
                        key={order.id}
                        className="bg-gray-50 p-4 rounded-xl mb-3 border border-gray-200"
                      >
                        <View className="flex-row justify-between items-center mb-2">
                          <Text className="text-sm font-medium text-gray-600">
                            Commande #{index + 1}
                          </Text>
                          <Text className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                            {formattedDate}
                          </Text>
                        </View>
                        <Text className="text-lg font-semibold text-gray-900 mb-1">
                          {totalPrice.toFixed(2)} €
                        </Text>
                        <Text className="text-sm text-gray-500">
                          {order.orderPrices.length} article{order.orderPrices.length > 1 ? 's' : ''}
                        </Text>
                      </View>
                    )
                  })
                ) : (
                  <Text className="text-center py-5 text-gray-500">
                    Vous n'avez pas encore de commandes.
                  </Text>
                )}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default Profile