import Constants from 'expo-constants'
import { Stack, useRouter } from 'expo-router'
import { useEffect, useRef, useState } from "react"
import { Dimensions, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import Markdown from 'react-native-markdown-display'
import { SafeAreaView } from 'react-native-safe-area-context'

const url = Constants.expoConfig?.extra?.apiUrl
const { width } = Dimensions.get('window')
const IMAGE_WIDTH = width * 0.35  // 35% of screen width for images

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

type ImageSliderProps = {
  images: string[]
  productId: number
}
const ImageSlider = ({ images, productId }: ImageSliderProps) => {
  const scrollViewRef = useRef(null)
  const [activeIndex, setActiveIndex] = useState(0)

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
      <Image
        source={{ uri: `${url}${images[0]}` }}
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
            <Image
              source={{ uri: `${url}${image}` }}
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
              className={`h-2 w-2 rounded-full mx-1 ${activeIndex === index ? 'bg-blue-500' : 'bg-gray-300'}`}
            />
          ))}
        </View>
      )}
    </View>
  )
}

const Products = () => {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const fetchProducts = async () => {
      if (!url) return // Guard against undefined URL

      setLoading(true)
      try {
        const response = await fetch(`${url}/api/products`)
        const data = await response.json()
        setProducts(data)
      } catch (error) {
        console.error('Error fetching products:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  // Format currency with proper symbol
  const formatPrice = (price: number, currency: string) => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    })

    return formatter.format(price)
  }

  // Truncate text to a certain number of characters
  const truncateText = (text: string, maxLength = 80) => {
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength) + '...'
  }

  // Navigation to product detail
  const goToProductDetail = (productId: number) => {
    router.navigate(`/product/${productId}`)
    // router.push(`/product/${productId}`)
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={['top']} className="flex-1 bg-gray-100">
        {/* Products list */}
        <ScrollView>
          <View className="flex w-full items-center justify-start py-8">
            <Image source={{ uri: `${url}/api/backoffice/files/cyna%20-%20logo%20-%20mix.png` }} className='h-[61.5px] w-[225px]' />
          </View>
          <View className="p-4">
            {loading ? (
              <Text className="text-center text-lg mt-6">Loading products...</Text>
            ) : products.length === 0 ? (
              <Text className="text-center text-lg mt-6 text-gray-600">No products available</Text>
            ) : (
              <View className="flex-row flex-wrap justify-between">
                {products.map((product) => (
                  <TouchableOpacity
                    key={product.id}
                    className="bg-white rounded-lg p-4 mb-4 shadow-md"
                    style={{ width: width * 0.45 }} // 45% of screen width
                    onPress={() => goToProductDetail(product.id)}
                  >
                    {/* Image slider - centered */}
                    <View className="items-center mb-3">
                      <ImageSlider
                        images={product.images}
                        productId={product.id}
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