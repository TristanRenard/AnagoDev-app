import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import Constants from "expo-constants";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Dimensions, Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import Markdown from "react-native-markdown-display";
import { SafeAreaView } from "react-native-safe-area-context";

const url = Constants.expoConfig?.extra?.apiUrl;
const { width } = Dimensions.get("window");
const IMAGE_WIDTH = width * 0.9; // 90% of screen width for detail images
const SIMILAR_IMAGE_WIDTH = width * 0.25; // 25% of screen width for similar product images

type Price = {
  id: number;
  stripeId: string;
  recurring: boolean;
  nickname: string | null;
  unit_amount: number;
  currency: string;
  interval: string;
  productId: number;
};

type Category = {
  id: number;
  title: string;
  description: string;
  order: number;
  images?: string[];
  created_at?: string;
  updated_at?: string;
};

type Product = {
  id: number;
  title: string;
  description: string;
  stripeId: string;
  isActive: boolean;
  isMarkdown: boolean;
  isSubscription: boolean;
  isTopProduct: boolean;
  price: number;
  prices: Price[];
  stock: number;
  duties: number;
  images: string[];
  categoryId: number;
  created_at: string;
  updated_at: string;
  category?: Category;
};

type ImageSliderProps = {
  images: string[];
  productId: number;
};

const ImageSlider = ({ images, productId }: ImageSliderProps) => {
  const [activeIndex, setActiveIndex] = useState(0);

  // Guard against empty images
  if (!images || images.length === 0) {
    return (
      <View className="bg-gray-200 rounded-lg" style={{ width: IMAGE_WIDTH, height: IMAGE_WIDTH }}>
        <Text className="text-center text-gray-500 mt-12">Pas d'image</Text>
      </View>
    );
  }

  // Handle the slider navigation
  const goToNextImage = () => {
    if (activeIndex < images.length - 1) {
      setActiveIndex(activeIndex + 1);
    }
  };

  const goToPreviousImage = () => {
    if (activeIndex > 0) {
      setActiveIndex(activeIndex - 1);
    }
  };

  return (
    <View className="relative" style={{ width: IMAGE_WIDTH, height: IMAGE_WIDTH }}>
      <Image
        source={{ uri: `${url}${images[activeIndex]}` }}
        className="rounded-lg"
        style={{ width: "100%", height: "100%" }}
        resizeMode="cover"
      />

      {/* Navigation arrows */}
      {images.length > 1 && (
        <>
          <TouchableOpacity
            onPress={goToPreviousImage}
            className="absolute left-2 top-1/2 bg-white bg-opacity-70 rounded-full p-2"
            style={{ transform: [{ translateY: -20 }] }}
            disabled={activeIndex === 0}
          >
            <Ionicons name="chevron-back" size={24} color={activeIndex === 0 ? "#ccc" : "#000"} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={goToNextImage}
            className="absolute right-2 top-1/2 bg-white bg-opacity-70 rounded-full p-2"
            style={{ transform: [{ translateY: -20 }] }}
            disabled={activeIndex === images.length - 1}
          >
            <Ionicons name="chevron-forward" size={24} color={activeIndex === images.length - 1 ? "#ccc" : "#000"} />
          </TouchableOpacity>
        </>
      )}

      {/* Indicators */}
      {images.length > 1 && (
        <View className="flex flex-row justify-center absolute bottom-3 left-0 right-0">
          {images.map((_, index) => (
            <TouchableOpacity
              key={`${productId}-ind-${index}`}
              onPress={() => setActiveIndex(index)}
              className={`h-2 w-2 rounded-full mx-1 ${activeIndex === index ? "bg-purple-500" : "bg-gray-300"}`}
            />
          ))}
        </View>
      )}
    </View>
  );
};

// Component for similar products
const SimilarProductItem = ({ product, onPress }: { product: Product; onPress: () => void }) => {
  // Show only the first image
  const image = product.images && product.images.length > 0 ? product.images[0] : null;

  // Format price with currency symbol
  const formatPrice = (price: number, currency: string) => {
    const formatter = new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: currency.toUpperCase(),
    });

    return formatter.format(price);
  };

  return (
    <TouchableOpacity className="mr-4 mb-2" style={{ width: SIMILAR_IMAGE_WIDTH }} onPress={onPress}>
      {/* Product image */}
      {image ? (
        <Image
          source={{ uri: `${url}${image}` }}
          className="rounded-lg mb-1"
          style={{ width: SIMILAR_IMAGE_WIDTH, height: SIMILAR_IMAGE_WIDTH }}
          resizeMode="cover"
        />
      ) : (
        <View
          className="bg-gray-200 rounded-lg mb-1"
          style={{ width: SIMILAR_IMAGE_WIDTH, height: SIMILAR_IMAGE_WIDTH }}
        >
          <Text className="text-center text-gray-500 text-xs mt-10">Pas d'image</Text>
        </View>
      )}

      {/* Product title - truncated */}
      <Text className="text-sm font-medium" numberOfLines={1}>
        {product.title}
      </Text>

      {/* Product price */}
      <Text className="text-xs text-purple-600 font-bold">
        {formatPrice(product.price, product.prices[0]?.currency || "eur")}
      </Text>
    </TouchableOpacity>
  );
};

const ProductDetail = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const selectedPrice = product?.prices?.[0]?.id;
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddToCart = async () => {
    try {
      await axios.post(`${url}/api/cart`, {
        selectedPrice,
        action: "add",
      });
      router.push("/cart");
    } catch (error) {
      return;
    }
  };

  // Format price with currency symbol
  const formatPrice = (price: number, currency: string) => {
    const formatter = new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: currency.toUpperCase(),
    });

    return formatter.format(price);
  };

  // Navigate to another product's detail
  const goToProductDetail = (productId: number) => {
    if (productId.toString() === id) return; // Don't navigate if it's the same product
    router.push(`/product/${productId}`);
  };

  // Fetch similar products from the same category
  const fetchSimilarProducts = async (categoryId: number) => {
    if (!url || !categoryId) return;

    setLoadingSimilar(true);
    try {
      const response = await fetch(`${url}/api/products?category=${categoryId}`);
      if (!response.ok) {
        throw new Error(`Erreur: ${response.status}`);
      }
      const data = await response.json();

      // Filter out the current product and limit to 5 products
      const filteredProducts = data.filter((p: Product) => p.id.toString() !== id.toString()).slice(0, 5);

      setSimilarProducts(filteredProducts);
    } catch (error) {
      console.error("Erreur lors du chargement des produits similaires:", error);
    } finally {
      setLoadingSimilar(false);
    }
  };

  useEffect(() => {
    const fetchProductDetails = async () => {
      if (!url || !id) return;

      setLoading(true);
      try {
        const response = await fetch(`${url}/api/products?id=${id}`);
        if (!response.ok) {
          throw new Error(`Erreur: ${response.status}`);
        }
        const data = await response.json();
        setProduct(data);

        // Once we have the product, fetch similar products from the same category
        if (data && data.categoryId) {
          fetchSimilarProducts(data.categoryId);
        }
      } catch (error) {
        console.error("Erreur lors du chargement du produit:", error);
        setError("Impossible de charger les détails du produit");
      } finally {
        setLoading(false);
      }
    };

    fetchProductDetails();
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#0000ff" />
        <Text className="mt-4 text-gray-600">Chargement du produit...</Text>
      </SafeAreaView>
    );
  }

  if (error || !product) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center p-4">
        <Text className="text-red-500 text-lg mb-4">{error || "Produit non trouvé"}</Text>
        <TouchableOpacity onPress={() => router.back()} className="bg-purple-500 py-2 px-4 rounded-lg">
          <Text className="text-white font-medium">Retour aux produits</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView className="flex-1 bg-white">
        <ScrollView>
          <View className="p-4">
            {/* Back button */}
            <TouchableOpacity onPress={() => router.back()} className="flex-row items-center mb-4">
              <Ionicons name="arrow-back" size={24} color="#333" />
              <Text className="ml-2 text-lg text-gray-700">Retour</Text>
            </TouchableOpacity>

            {/* Product images */}
            <View className="items-center mb-6">
              <ImageSlider images={product.images} productId={product.id} />
            </View>

            {/* Product info */}
            <View className="mb-6">
              <Text className="text-2xl font-bold mb-2">{product.title}</Text>
              {product.category && (
                <Text className="text-sm text-gray-500 mb-3">Catégorie: {product.category.title}</Text>
              )}
              <Text className="text-xl font-semibold text-purple-600 mb-4">
                {formatPrice(product.price, product.prices[0]?.currency || "eur")}
              </Text>

              {/* Stock info */}
              <View className="flex-row items-center mb-4">
                <View
                  className={`h-3 w-3 rounded-full mr-2 ${
                    product.stock > 0 || product.stock === -1 ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                <Text className={`${product.stock > 0 || product.stock === -1 ? "text-green-600" : "text-red-600"}`}>
                  {product.stock > 0
                    ? `En stock (${product.stock})`
                    : product.stock === -1
                    ? "En stock"
                    : "Rupture de stock"}
                </Text>
              </View>

              {/* Product badges */}
              <View className="flex-row flex-wrap mb-4">
                {product.isTopProduct && (
                  <View className="bg-yellow-100 px-2 py-1 rounded-md mr-2 mb-2">
                    <Text className="text-yellow-800 text-xs">Produit Populaire</Text>
                  </View>
                )}
                {product.isSubscription && (
                  <View className="bg-purple-100 px-2 py-1 rounded-md mr-2 mb-2">
                    <Text className="text-purple-800 text-xs">Abonnement</Text>
                  </View>
                )}
              </View>

              {/* Description */}
              <Text className="text-lg font-medium mb-2">Description</Text>
              <Text className="text-base text-gray-700 leading-6">
                <Markdown>{product.description}</Markdown>
              </Text>
            </View>

            {/* Add to cart button */}
            <TouchableOpacity
              onPress={handleAddToCart}
              className={`py-3 px-4 rounded-lg ${
                product.stock > 0 || product.stock === -1 ? "bg-purple-500" : "bg-gray-400"
              } mb-8`}
              disabled={product.stock <= 0 && product.stock !== -1}
            >
              <Text className="text-white text-center font-bold text-lg">
                {product.stock > 0 || product.stock === -1 ? "Ajouter au panier" : "Indisponible"}
              </Text>
            </TouchableOpacity>

            {/* Similar Products Section */}
            {similarProducts.length > 0 && (
              <View className="mb-6">
                <Text className="text-lg font-bold mb-4">Produits similaires</Text>

                {loadingSimilar ? (
                  <ActivityIndicator size="small" color="#9333ea" />
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pb-2">
                    {similarProducts.map((similarProduct) => (
                      <SimilarProductItem
                        key={`similar-${similarProduct.id}`}
                        product={similarProduct}
                        onPress={() => goToProductDetail(similarProduct.id)}
                      />
                    ))}
                  </ScrollView>
                )}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
};

export default ProductDetail;
