import axios from "axios"
import Constants from "expo-constants"
import { Stack, useLocalSearchParams, useRouter } from "expo-router"
import LottieView from "lottie-react-native"
import { ArrowLeft, Check, LoaderCircle, RefreshCcw } from "lucide-react-native"
import { useEffect, useRef, useState } from "react"
import { ActivityIndicator, Animated, Dimensions, SafeAreaView, Text, TouchableOpacity, View } from "react-native"
import { WebView } from "react-native-webview"

const url = Constants.expoConfig?.extra?.apiUrl as string

interface PaymentState {
  status: "loading" | "success" | "failed" | "canceled" | "processing"
  message?: string
}

const Payment = () => {
  const router = useRouter()
  const params = useLocalSearchParams()
  const paymentUrl = params.url as string
  const [paymentState, setPaymentState] = useState<PaymentState>({ status: "loading" })
  const [showWebView, setShowWebView] = useState<boolean>(false)

  // Animation refs pour la page de succès
  const animationRef = useRef<LottieView>(null)
  const fadeAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    // Vérifier si l'URL de paiement est valide
    if (!paymentUrl) {
      setPaymentState({
        status: "failed",
        message: "URL de paiement manquante ou invalide"
      })
      return
    }

    // Initialiser le processus de paiement
    initPayment()
  }, [paymentUrl])

  // Vérifier l'état de l'animation et de la vérification de commande quand le statut passe à success
  useEffect(() => {
    if (paymentState.status === "success") {
      // Vérifier la commande auprès du serveur
      verifyOrder()

      // Déclencher l'animation de confettis
      if (animationRef.current) {
        animationRef.current.play()
      }

      // Animation d'entrée du texte
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start()
    }
  }, [paymentState.status])

  const initPayment = async () => {
    try {
      // Option 1: Utiliser WebView intégrée
      setShowWebView(true)

      // Option 2: Rediriger vers le navigateur externe (alternative)
      // const result = await WebBrowser.openAuthSessionAsync(paymentUrl);
      // handlePaymentResult(result);
    } catch (error) {
      console.error("Erreur lors de l'ouverture de la page de paiement:", error)
      setPaymentState({
        status: "failed",
        message: "Impossible d'ouvrir la page de paiement"
      })
    }
  }

  const handleWebViewNavigation = (navState: any) => {
    // Surveiller les URLs de callback pour détecter le statut du paiement
    const currentUrl = navState.url

    if (currentUrl.includes("success")) {
      setShowWebView(false)
      setPaymentState({ status: "success" })
      // Appeler l'API pour confirmer le paiement côté serveur
      confirmPayment("success")
    } else if (currentUrl.includes("cart")) {
      setShowWebView(false)
      setPaymentState({ status: "canceled" })
    }
  }

  const confirmPayment = async (status: string) => {
    try {
      await axios.post(`${url}/api/payment/confirm`, {
        status,
        sessionId: extractSessionId(paymentUrl)
      })
    } catch (error) {
      console.error("Erreur lors de la confirmation du paiement:", error)
    }
  }

  const verifyOrder = async () => {
    try {
      await axios.get(`${url}/api/verifyOrder`)
      // La commande est validée côté serveur
    } catch (error) {
      console.error("Erreur lors de la vérification de la commande:", error)
    }
  }

  const extractSessionId = (url: string): string => {
    // Extraire l'ID de session de l'URL de paiement (à adapter selon votre format d'URL)
    const match = url.match(/session_id=([^&]+)/)
    return match ? match[1] : ""
  }

  const retryPayment = () => {
    setPaymentState({ status: "loading" })
    initPayment()
  }

  const navigateHome = () => {
    router.push("/(tabs)")
  }

  const navigateToOrders = () => {
    router.push("/(tabs)/auth/account")
  }

  // Rendu en fonction de l'état du paiement
  const renderContent = () => {
    switch (paymentState.status) {
      case "loading":
        return (
          <View className="flex-1 justify-center items-center p-6">
            <LoaderCircle size={48} color="#7C3AED" className="mb-4" />
            <Text className="text-xl font-semibold text-gray-800 text-center mb-2">
              Préparation de votre paiement
            </Text>
            <Text className="text-gray-600 text-center">
              Vous allez être redirigé vers notre service de paiement sécurisé...
            </Text>
          </View>
        )

      case "success":
        return (
          <View className="flex-1 justify-center items-center p-6">
            {/* Animation de confettis */}
            <View className="absolute inset-0">
              <LottieView
                ref={animationRef}
                source={require('../assets/animations/confetti.json')}
                autoPlay={false}
                loop={false}
                style={{
                  width: Dimensions.get('window').width,
                  height: Dimensions.get('window').height
                }}
              />
            </View>

            {/* Contenu principal avec animation */}
            <Animated.View
              style={{
                opacity: fadeAnim,
                transform: [{
                  translateY: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0]
                  })
                }]
              }}
              className="items-center"
            >
              <View className="w-20 h-20 rounded-full bg-green-100 justify-center items-center mb-6">
                <Check size={40} color="#10B981" />
              </View>

              <Text className="text-2xl font-bold text-gray-900 mb-6 text-center">
                Paiement confirmé !
              </Text>

              <Text className="text-gray-600 text-center mb-2">
                Merci pour votre commande ! Vous pouvez désormais accéder à vos commandes depuis votre compte.
              </Text>

              <Text className="text-gray-600 text-center mb-8">
                Nous vous enverrons un email avec le code d'activation.
              </Text>

              <View className="w-full flex flex-col gap-4">
                <TouchableOpacity
                  className="bg-green-600 py-3 rounded-xl items-center"
                  onPress={navigateToOrders}
                >
                  <Text className="text-white font-bold px-2">Voir mes commandes</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="bg-gray-200 py-3 rounded-xl items-center"
                  onPress={navigateHome}
                >
                  <Text className="text-gray-800 font-medium">Retour à l'accueil</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        )

      case "canceled":
        return (
          <View className="flex-1 justify-center items-center p-6">
            <View className="w-16 h-16 rounded-full bg-yellow-100 justify-center items-center mb-4">
              <RefreshCcw size={32} color="#F59E0B" />
            </View>
            <Text className="text-xl font-semibold text-gray-800 text-center mb-2">
              Paiement annulé
            </Text>
            <Text className="text-gray-600 text-center mb-8">
              Vous avez annulé votre paiement. Votre panier a été conservé.
            </Text>
            <View className="w-full space-y-4">
              <TouchableOpacity
                className="bg-purple-600 py-3 rounded-xl items-center"
                onPress={retryPayment}
              >
                <Text className="text-white font-bold">Réessayer le paiement</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-gray-200 py-3 rounded-xl items-center"
                onPress={() => router.back()}
              >
                <Text className="text-gray-800 font-medium">Retour au panier</Text>
              </TouchableOpacity>
            </View>
          </View>
        )

      default:
        return null
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView className="flex-1 bg-white">
        {/* Header avec bouton retour */}
        <View className="p-4 flex-row items-center border-b border-gray-200">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <ArrowLeft size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">Paiement</Text>
        </View>

        {/* WebView pour le paiement ou contenu basé sur l'état */}
        {showWebView ? (
          <WebView
            source={{ uri: paymentUrl }}
            onNavigationStateChange={handleWebViewNavigation}
            startInLoadingState={true}
            renderLoading={() => (
              <View className="absolute inset-0 flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color="#7C3AED" />
                <Text className="mt-4 text-gray-600">Chargement du paiement...</Text>
              </View>
            )}
          />
        ) : (
          renderContent()
        )}
      </SafeAreaView>
    </>
  )
}

export default Payment