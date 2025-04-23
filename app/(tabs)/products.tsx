import AsyncStorage from '@react-native-async-storage/async-storage'
import NetInfo from '@react-native-community/netinfo'
import Constants from 'expo-constants'
import { Stack, useRouter } from 'expo-router'
import { useEffect, useRef, useState } from "react"
import { Dimensions, Image, ScrollView, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native'
import Markdown from 'react-native-markdown-display'
import { SafeAreaView } from 'react-native-safe-area-context'

const url = Constants.expoConfig?.extra?.apiUrl
const { width: screenWidth } = Dimensions.get('window')

// Cache keys
const CACHE_KEYS = {
  PRODUCTS: 'app_products',
  CACHE_TIMESTAMP: 'app_cache_timestamp',
  IMAGES: 'app_images_'
}

// Cache expiration in milliseconds (24 hours)
const CACHE_EXPIRATION = 24 * 60 * 60 * 1000

type Price = {
  id: number
  stripeId: string
  recurring: boolean
  nickname: string | null
  unit_amount: number
  currency: string
  interval: string
  productId: number
}

type Category = {
  id: number
  title: string
  description: string
  order: number
  images?: string[]
  created_at?: string
  updated_at?: string
}

type Product = {
  id: number
  title: string
  description: string
  stripeId: string
  isActive: boolean
  isMarkdown: boolean
  isSubscription: boolean
  isTopProduct: boolean
  price: number
  prices: Price[]
  stock: number
  duties: number
  images: string[]
  categoryId: number
  created_at: string
  updated_at: string
  category?: Category
}

// Cache utility functions
const saveToCache = async (key: string, data: any) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data))
    // Update timestamp when cache is updated
    await AsyncStorage.setItem(CACHE_KEYS.CACHE_TIMESTAMP, Date.now().toString())
  } catch (error) {
    console.error(`Error saving to cache (${key}):`, error)
  }
}

const getFromCache = async (key: string) => {
  try {
    const cachedData = await AsyncStorage.getItem(key)
    return cachedData ? JSON.parse(cachedData) : null
  } catch (error) {
    console.error(`Error getting from cache (${key}):`, error)
    return null
  }
}

const isCacheValid = async () => {
  try {
    const timestamp = await AsyncStorage.getItem(CACHE_KEYS.CACHE_TIMESTAMP)
    if (!timestamp) return false

    const cacheAge = Date.now() - parseInt(timestamp)
    return cacheAge < CACHE_EXPIRATION
  } catch (error) {
    console.error('Error checking cache validity:', error)
    return false
  }
}

// Hook personnalisé pour gérer la grille responsive
const useResponsiveGrid = () => {
  const { width, height } = useWindowDimensions()

  // Paramètres de mise en page
  const containerPadding = 16
  const itemGap = 16

  // Détermine le nombre de colonnes
  const columnsCount = getColumnsCount(width, height)

  // Calcule la mise en page exacte
  const layout = getFlexLayout(width, columnsCount, containerPadding, itemGap)

  return {
    ...layout,
    columnsCount
  }
}

// Fonction pour déterminer le nombre de colonnes selon la taille d'écran
const getColumnsCount = (width: number, height: number) => {
  const isLandscape = width > height

  // Points de rupture ajustés pour différents appareils
  if (width < 600) {
    return 2 // Mobile: 2 colonnes
  } else if (width >= 600 && width < 1100) {
    return isLandscape ? 4 : 3 // Tablette: 3 en portrait, 4 en paysage
  } else {
    return 4 // Grand écran: 4+ colonnes
  }
}

// Fonction pour calculer précisément la mise en page avec flexbox et gap
const getFlexLayout = (screenWidth: number, columnsCount: number, containerPadding: number = 16, itemGap: number = 16) => {
  // Espace disponible dans le conteneur
  const availableWidth = screenWidth - (containerPadding * 2)

  // Avec le système de gap, on calcule la largeur exacte des items
  const itemWidth = (availableWidth - ((columnsCount - 1) * itemGap)) / columnsCount

  return {
    containerPadding,
    itemGap,
    itemWidth,
    containerStyle: {
      padding: containerPadding,
      gap: itemGap
    }
  }
}

// Enhanced image component with caching
type CachedImageProps = {
  imageUri: string
  style?: any
  className?: string
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center'
}

const CachedImage = ({ imageUri, style, className, resizeMode = 'cover' }: CachedImageProps) => {
  const [uri, setUri] = useState<string | null>(null)

  useEffect(() => {
    const loadImage = async () => {
      if (!imageUri) return

      try {
        // Try to get cached image first
        const cachedImage = await AsyncStorage.getItem(`${CACHE_KEYS.IMAGES}${imageUri}`)
        if (cachedImage) {
          setUri(cachedImage)
          return
        }

        // If not cached, use the network image
        setUri(imageUri)

        // Cache the image URL for offline use
        if (imageUri) {
          await AsyncStorage.setItem(`${CACHE_KEYS.IMAGES}${imageUri}`, imageUri)
        }
      } catch (error) {
        console.error('Error loading image:', error)
      }
    }

    loadImage()
  }, [imageUri])

  return (
    <Image
      source={{ uri: uri || imageUri }}
      className={className}
      style={style}
      resizeMode={resizeMode}
    />
  )
}

type ImageSliderProps = {
  images: string[]
  productId: number
  imageWidth?: number
}

const ImageSlider = ({ images, productId, imageWidth }: ImageSliderProps) => {
  const scrollViewRef = useRef(null)
  const [activeIndex, setActiveIndex] = useState(0)

  // Utiliser la largeur fournie ou calculer une valeur par défaut
  const IMAGE_WIDTH = imageWidth || screenWidth * 0.35

  // Guard against empty images
  if (!images || images.length === 0) {
    return (
      <View className="bg-gray-200 rounded-lg" style={{ width: IMAGE_WIDTH, height: IMAGE_WIDTH }}>
        <Text className="text-center text-gray-500 mt-12">No image</Text>
      </View>
    )
  }

  // If there's only 1 image, show it without slider functionality
  if (images.length === 1) {
    return (
      <CachedImage
        imageUri={`${url}${images[0]}`}
        className="rounded-lg"
        style={{ width: IMAGE_WIDTH, height: IMAGE_WIDTH }}
        resizeMode="cover"
      />
    )
  }

  // Handle scroll events to update active indicator
  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x
    const newIndex = Math.round(contentOffsetX / IMAGE_WIDTH)
    if (newIndex !== activeIndex && newIndex >= 0 && newIndex < images.length) {
      setActiveIndex(newIndex)
    }
  }

  // Handle indicator press
  const scrollToImage = (index: number) => {
    if (scrollViewRef.current) {
      // @ts-ignore
      scrollViewRef.current.scrollTo({ x: index * IMAGE_WIDTH, animated: true })
    }
  }

  return (
    <View style={{ width: IMAGE_WIDTH }}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        snapToInterval={IMAGE_WIDTH}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {images.map((image, index) => (
          <View
            key={`${productId}-img-${index}`}
            style={{ width: IMAGE_WIDTH, height: IMAGE_WIDTH }}
          >
            <CachedImage
              imageUri={`${url}${image}`}
              className="rounded-lg"
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          </View>
        ))}
      </ScrollView>

      {/* Indicators */}
      {images.length > 1 && (
        <View className="flex flex-row justify-center mt-2">
          {images.map((_, index) => (
            <TouchableOpacity
              key={`${productId}-ind-${index}`}
              onPress={() => scrollToImage(index)}
              className={`h-2 w-2 rounded-full mx-1 ${activeIndex === index ? 'bg-purple-500' : 'bg-gray-300'}`}
            />
          ))}
        </View>
      )}
    </View>
  )
}

const Products = () => {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [isConnected, setIsConnected] = useState<boolean | null>(true)
  const [isOfflineMode, setIsOfflineMode] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Utilisation du hook responsive avec le layout flex
  const { itemWidth, itemGap, containerStyle, containerPadding, columnsCount } = useResponsiveGrid()

  // Écoutons les changements d'orientation de l'écran
  const dimensions = useWindowDimensions()

  // Check network connection
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected)
      if (!state.isConnected) {
        setIsOfflineMode(true)
      }
    })

    return () => unsubscribe()
  }, [])

  // Fetch products with caching
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true)

      try {
        // First check if we have cached products
        const cachedProducts = await getFromCache(CACHE_KEYS.PRODUCTS)

        // If offline or cache is valid, use cached data
        if ((isOfflineMode || !(await isCacheValid())) && cachedProducts) {
          setProducts(cachedProducts)
          setLoading(false)
          return
        }

        // If we're online, fetch fresh data
        if (isConnected && url) {
          const response = await fetch(`${url}/api/products`)
          if (!response.ok) {
            throw new Error(`Error: ${response.status}`)
          }
          const data = await response.json()

          // Update state and cache
          setProducts(data)
          await saveToCache(CACHE_KEYS.PRODUCTS, data)
        } else if (cachedProducts) {
          // Use cached data if offline and we have it
          setProducts(cachedProducts)
        } else {
          // No cached data and offline
          setError('Pas de connexion internet et aucune donnée en cache')
        }
      } catch (error) {
        console.error('Error fetching products:', error)

        // Try to use cached products on error
        const cachedProducts = await getFromCache(CACHE_KEYS.PRODUCTS)
        if (cachedProducts) {
          setProducts(cachedProducts)
        } else {
          setError('Impossible de charger les produits')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [isConnected])

  // Format currency with proper symbol
  const formatPrice = (price: number, currency: string) => {
    const formatter = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency.toUpperCase(),
    })

    return formatter.format(price / 100)
  }

  // Truncate text to a certain number of characters
  const truncateText = (text: string, maxLength = 80) => {
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength) + '...'
  }

  // Navigation to product detail
  const goToProductDetail = (productId: number) => {
    router.navigate(`/product/${productId}`)
  }

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView className="flex-1 bg-gray-100 justify-center items-center">
          <Text className="text-center text-lg">Chargement des produits...</Text>
        </SafeAreaView>
      </>
    )
  }

  if (error) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView className="flex-1 bg-gray-100 justify-center items-center p-4">
          <Text className="text-red-500 text-lg mb-6 text-center">{error}</Text>
        </SafeAreaView>
      </>
    )
  }

  // Les tailles d'images sont calculées directement dans le rendu
  // Pas besoin de variable supplémentaire qui pourrait causer des problèmes

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView className="flex-1 bg-gray-100">
        {/* Products list */}
        <ScrollView>
          <View className="flex w-full items-center justify-start py-8">
            <Image source={{ uri: `${url}/api/backoffice/files/cyna%20-%20logo%20-%20mix.png` }} className='h-[61.5px] w-[225px]' />
            {isOfflineMode && (
              <View className="bg-yellow-100 px-3 py-1 rounded-md mt-2">
                <Text className="text-yellow-800">Mode hors connexion</Text>
              </View>
            )}
          </View>
          <View style={containerStyle}>
            {products.length === 0 ? (
              <Text className="text-center text-lg mt-6 text-gray-600">Aucun produit disponible</Text>
            ) : (
              <View style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: itemGap
              }}>
                {products.map((product) => (
                  <TouchableOpacity
                    key={product.id}
                    className="bg-white rounded-lg shadow-md"
                    style={{
                      width: itemWidth,
                      padding: containerPadding / 2
                    }}
                    onPress={() => goToProductDetail(product.id)}
                  >
                    {/* Image slider - centered */}
                    <View className="items-center mb-3">
                      <ImageSlider
                        images={product.images}
                        productId={product.id}
                        imageWidth={itemWidth * 0.85}
                      />
                    </View>

                    {/* Product info */}
                    <View>
                      <Text className="text-lg font-bold mb-1">{product.title}</Text>
                      <Text className="text-gray-600 mb-2">
                        <Markdown>
                          {truncateText(product.description)}
                        </Markdown>
                      </Text>
                      <Text className="text-base font-semibold text-gray-800 mt-2">
                        {formatPrice(product.price, product.prices[0]?.currency || 'eur')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  )
}

export default Products