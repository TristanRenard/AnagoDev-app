import AsyncStorage from '@react-native-async-storage/async-storage'
import NetInfo from '@react-native-community/netinfo'
import Constants from 'expo-constants'
import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Dimensions, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import Markdown from 'react-native-markdown-display'
import { SafeAreaView } from 'react-native-safe-area-context'

const url = Constants.expoConfig?.extra?.apiUrl
const { width } = Dimensions.get('window')
const PRODUCT_IMAGE_WIDTH = width * 0.35  // 35% of screen width for product images

// Cache keys
const CACHE_KEYS = {
  CATEGORIES: 'app_categories',
  CATEGORY_PRODUCTS: 'app_category_products_',
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

// Component for product image display
type ProductImageProps = {
  images: string[]
  productId: number
}

const ProductImage = ({ images, productId }: ProductImageProps) => {
  const [imageUri, setImageUri] = useState<string | null>(null)

  useEffect(() => {
    const loadImage = async () => {
      if (!images || images.length === 0) return

      try {
        // Try to get cached image first
        const cachedImage = await AsyncStorage.getItem(`${CACHE_KEYS.IMAGES}${images[0]}`)
        if (cachedImage) {
          setImageUri(cachedImage)
          return
        }

        // If not cached, use the network image
        setImageUri(`${url}${images[0]}`)

        // Cache the image URL for offline use
        if (url && images[0]) {
          // We're just caching the URL here, in a real app you might want 
          // to download and cache the actual image data
          await AsyncStorage.setItem(`${CACHE_KEYS.IMAGES}${images[0]}`, `${url}${images[0]}`)
        }
      } catch (error) {
        console.error('Error loading image:', error)
      }
    }

    loadImage()
  }, [images])

  // Guard against empty images
  if (!images || images.length === 0) {
    return (
      <View className="bg-gray-200 rounded-lg" style={{ width: PRODUCT_IMAGE_WIDTH, height: PRODUCT_IMAGE_WIDTH }}>
        <Text className="text-center text-gray-500 mt-12">Pas d'image</Text>
      </View>
    )
  }

  // Display only the first image
  return (
    <Image
      source={{ uri: imageUri || `${url}${images[0]}` }}
      className="rounded-lg"
      style={{ width: PRODUCT_IMAGE_WIDTH, height: PRODUCT_IMAGE_WIDTH }}
      resizeMode="cover"
    />
  )
}

// Component for individual product in horizontal scroll
type ProductItemProps = {
  product: Product
  onPress: () => void
}

const ProductItem = ({ product, onPress }: ProductItemProps) => {
  // Format price with currency symbol
  const formatPrice = (price: number, currency: string) => {
    const formatter = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency.toUpperCase(),
    })

    return formatter.format(price / 100)
  }

  // Truncate text
  const truncateText = (text: string, maxLength = 60) => {
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength) + '...'
  }

  return (
    <TouchableOpacity
      className="mr-4 bg-white rounded-lg shadow-sm p-2 mb-2"
      style={{ width: PRODUCT_IMAGE_WIDTH + 16 }}
      onPress={onPress}
    >
      {/* Center the image */}
      <View className="items-center">
        <ProductImage images={product.images} productId={product.id} />
      </View>

      {/* Product details */}
      <View className="mt-2">
        <Text className="font-bold" numberOfLines={1}>{product.title}</Text>
        <Text className="text-gray-500 text-xs mt-1 mb-2" numberOfLines={2}>
          <Markdown>
            {truncateText(product.description)}
          </Markdown>
        </Text>
        <Text className="text-purple-600 font-semibold">
          {formatPrice(product.price, product.prices[0]?.currency || 'eur')}
        </Text>

        {/* Optional badges for special products */}
        {(product.isTopProduct || product.isMarkdown) && (
          <View className="flex-row mt-1">
            {product.isTopProduct && (
              <View className="bg-yellow-100 px-1 py-0.5 rounded-sm mr-1">
                <Text className="text-yellow-800 text-xs">Populaire</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  )
}

const Home = () => {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [categoryProducts, setCategoryProducts] = useState<Record<number, Product[]>>({})
  const [loadingProducts, setLoadingProducts] = useState<Record<number, boolean>>({})
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState<boolean | null>(true)
  const [isOfflineMode, setIsOfflineMode] = useState(false)

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

  // Navigation to product detail
  const goToProductDetail = (productId: number) => {
    router.push(`/product/${productId}`)
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

  // Fetch products for a specific category with caching
  const fetchProductsByCategory = async (categoryId: number) => {
    if (!url && !isOfflineMode) return

    setLoadingProducts(prev => ({ ...prev, [categoryId]: true }))

    try {
      // First check if we have cached data for this category
      const cachedProducts = await getFromCache(`${CACHE_KEYS.CATEGORY_PRODUCTS}${categoryId}`)

      // If we're offline or cache is valid, use cached data
      if ((isOfflineMode || !(await isCacheValid())) && cachedProducts) {
        setCategoryProducts(prev => ({ ...prev, [categoryId]: cachedProducts }))
        setLoadingProducts(prev => ({ ...prev, [categoryId]: false }))
        return
      }

      // If we're online, fetch fresh data
      if (isConnected) {
        const response = await fetch(`${url}/api/products?category=${categoryId}`)
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`)
        }
        const data = await response.json()

        // Update state and cache
        setCategoryProducts(prev => ({ ...prev, [categoryId]: data }))
        await saveToCache(`${CACHE_KEYS.CATEGORY_PRODUCTS}${categoryId}`, data)
      } else if (cachedProducts) {
        // Use cached data if offline and we have it
        setCategoryProducts(prev => ({ ...prev, [categoryId]: cachedProducts }))
      } else {
        // No cached data and offline
        setCategoryProducts(prev => ({ ...prev, [categoryId]: [] }))
      }
    } catch (error) {
      console.error(`Error fetching products for category ${categoryId}:`, error)

      // Try to use cached data on error
      const cachedProducts = await getFromCache(`${CACHE_KEYS.CATEGORY_PRODUCTS}${categoryId}`)
      if (cachedProducts) {
        setCategoryProducts(prev => ({ ...prev, [categoryId]: cachedProducts }))
      }
    } finally {
      setLoadingProducts(prev => ({ ...prev, [categoryId]: false }))
    }
  }

  // Fetch all categories with caching
  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCategories(true)

      try {
        // First check if we have cached categories
        const cachedCategories = await getFromCache(CACHE_KEYS.CATEGORIES)

        // If offline or cache is valid, use cached data
        if ((isOfflineMode || !(await isCacheValid())) && cachedCategories) {
          setCategories(cachedCategories)

          // Initialize loading state for each category
          const initialLoadingState: Record<number, boolean> = {}
          cachedCategories.forEach((cat: Category) => {
            initialLoadingState[cat.id] = true
          })
          setLoadingProducts(initialLoadingState)

          // Fetch products for each category
          cachedCategories.forEach((category: Category) => {
            fetchProductsByCategory(category.id)
          })

          setLoadingCategories(false)
          return
        }

        // If we're online, fetch fresh data
        if (isConnected && url) {
          const response = await fetch(`${url}/api/categories`)
          if (!response.ok) {
            throw new Error(`Error: ${response.status}`)
          }
          const data = await response.json()

          // Sort categories by order field
          const sortedCategories = data.sort((a: Category, b: Category) => a.order - b.order)

          // Update state and cache
          setCategories(sortedCategories)
          await saveToCache(CACHE_KEYS.CATEGORIES, sortedCategories)

          // Initialize loading state for each category
          const initialLoadingState: Record<number, boolean> = {}
          sortedCategories.forEach((cat: Category) => {
            initialLoadingState[cat.id] = true
          })
          setLoadingProducts(initialLoadingState)

          // Fetch products for each category
          sortedCategories.forEach((category: Category) => {
            fetchProductsByCategory(category.id)
          })
        } else if (cachedCategories) {
          // Use cached data if offline and we have it
          setCategories(cachedCategories)

          // Initialize loading state for each category
          const initialLoadingState: Record<number, boolean> = {}
          cachedCategories.forEach((cat: Category) => {
            initialLoadingState[cat.id] = true
          })
          setLoadingProducts(initialLoadingState)

          // Fetch products for each category (will use cache)
          cachedCategories.forEach((category: Category) => {
            fetchProductsByCategory(category.id)
          })
        } else {
          // No cached data and offline
          setError('Pas de connexion internet et aucune donnée en cache')
        }
      } catch (error) {
        console.error('Error fetching categories:', error)

        // Try to use cached categories on error
        const cachedCategories = await getFromCache(CACHE_KEYS.CATEGORIES)
        if (cachedCategories) {
          setCategories(cachedCategories)

          // Initialize loading state for each category
          const initialLoadingState: Record<number, boolean> = {}
          cachedCategories.forEach((cat: Category) => {
            initialLoadingState[cat.id] = true
          })
          setLoadingProducts(initialLoadingState)

          // Fetch products for each category (will use cache)
          cachedCategories.forEach((category: Category) => {
            fetchProductsByCategory(category.id)
          })
        } else {
          setError('Impossible de charger les catégories')
        }
      } finally {
        setLoadingCategories(false)
      }
    }

    fetchCategories()
  }, [isConnected])

  // Clear local cache function (for reference, you might want to add this to settings)
  const clearLocalCache = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys()
      const cacheKeys = keys.filter(key =>
        key.startsWith(CACHE_KEYS.CATEGORIES) ||
        key.startsWith(CACHE_KEYS.CATEGORY_PRODUCTS) ||
        key.startsWith(CACHE_KEYS.IMAGES)
      )
      await AsyncStorage.multiRemove(cacheKeys)
      console.log('Cache cleared successfully')
    } catch (error) {
      console.error('Error clearing cache:', error)
    }
  }

  if (loadingCategories && !categories.length) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator size="large" color="#9333ea" />
        <Text className="mt-4 text-gray-600">Chargement des catégories...</Text>
      </SafeAreaView>
    )
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center p-4">
        <Text className="text-red-500 text-lg mb-6 text-center">{error}</Text>
        <TouchableOpacity
          onPress={() => router.push('/products')}
          className="bg-purple-500 py-2 px-4 rounded-lg"
        >
          <Text className="text-white font-medium">Voir tous les produits</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView>
        {/* Header */}
        <View className="flex w-full items-center justify-start py-4">
          <Image source={{ uri: `${url}/api/backoffice/files/cyna%20-%20logo%20-%20mix.png` }} className='h-[61.5px] w-[225px]' />
          {isOfflineMode && (
            <View className="bg-yellow-100 px-3 py-1 rounded-md mt-2">
              <Text className="text-yellow-800">Mode hors connexion</Text>
            </View>
          )}
        </View>

        {/* Categories with products */}
        <View className="py-4">
          {categories.map((category) => {
            const products = categoryProducts[category.id] || []
            const isLoading = loadingProducts[category.id]

            return (
              <View key={`section-${category.id}`} className="mt-4">
                {/* Category header */}
                <View className="px-4 flex-row justify-between items-center mb-3">
                  <Text className="text-lg font-bold">{category.title}</Text>

                  {/* "See all" button */}
                  {products.length > 3 && (
                    <TouchableOpacity
                      className="bg-purple-100 rounded-lg px-3 py-1"
                      onPress={() => router.push('/products')}
                    >
                      <Text className="text-purple-700 font-medium">Voir tout</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Products horizontal list */}
                <View className="min-h-12">
                  {isLoading ? (
                    <View className="items-center justify-center py-6">
                      <ActivityIndicator size="small" color="#9333ea" />
                    </View>
                  ) : products.length > 0 ? (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ paddingLeft: 16, paddingRight: 8 }}
                    >
                      {products.filter((product) => product.category?.id === category.id).map((product) => (
                        <ProductItem
                          key={`product-${product.id}`}
                          product={product}
                          onPress={() => goToProductDetail(product.id)}
                        />
                      ))}
                    </ScrollView>
                  ) : (
                    <View className="items-center justify-center py-6">
                      <Text className="text-gray-500">Aucun produit dans cette catégorie</Text>
                    </View>
                  )}
                </View>
              </View>
            )
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default Home