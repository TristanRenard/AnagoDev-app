import Constants from 'expo-constants'
import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Dimensions, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import Markdown from 'react-native-markdown-display'
import { SafeAreaView } from 'react-native-safe-area-context'

const url = Constants.expoConfig?.extra?.apiUrl
const { width } = Dimensions.get('window')
const PRODUCT_IMAGE_WIDTH = width * 0.35  // 35% of screen width for product images

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
      source={{ uri: `${url}${images[0]}` }}
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

    return formatter.format(price)
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

  // Navigation to product detail
  const goToProductDetail = (productId: number) => {
    router.push(`/product/${productId}`)
  }

  // Fetch products for a specific category
  const fetchProductsByCategory = async (categoryId: number) => {
    if (!url) return

    setLoadingProducts(prev => ({ ...prev, [categoryId]: true }))
    try {
      const response = await fetch(`${url}/api/products?category=${categoryId}`)
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`)
      }
      const data = await response.json()
      setCategoryProducts(prev => ({ ...prev, [categoryId]: data }))
    } catch (error) {
      console.error(`Error fetching products for category ${categoryId}:`, error)
    } finally {
      setLoadingProducts(prev => ({ ...prev, [categoryId]: false }))
    }
  }

  // Fetch all categories
  useEffect(() => {
    const fetchCategories = async () => {
      if (!url) return

      setLoadingCategories(true)
      try {
        const response = await fetch(`${url}/api/categories`)
        if (!response.ok) {
          console.error('Error fetching categories:', response)
          throw new Error(`Error: ${response.status}`)
        }
        const data = await response.json()

        // Sort categories by order field
        const sortedCategories = data.sort((a: Category, b: Category) => a.order - b.order)
        setCategories(sortedCategories)

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
      } catch (error) {
        console.error('Error fetching categories:', error)
        setError('Impossible de charger les catégories')
      } finally {
        setLoadingCategories(false)
      }
    }

    fetchCategories()
  }, [])

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
    <SafeAreaView edges={['top']} className="flex-1 bg-gray-50">
      <ScrollView>
        {/* Header */}
        <View className="flex w-full items-center justify-start py-4">
          <Image source={{ uri: `${url}/api/backoffice/files/cyna%20-%20logo%20-%20mix.png` }} className='h-[61.5px] w-[225px]' />
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