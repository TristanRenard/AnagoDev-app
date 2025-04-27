import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import axios from "axios"
import Constants from "expo-constants"
import { useRouter } from "expo-router"
import { AlertTriangle, Clock, ExternalLink, MessageSquare, PlusCircle, Send } from "lucide-react-native"
import React, { useEffect, useRef, useState } from "react"
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native"
import Markdown from 'react-native-markdown-display'
import { SafeAreaView } from "react-native-safe-area-context"

const url = Constants.expoConfig?.extra?.apiUrl as string

// Types
interface Message {
  role: "user" | "assistant"
  content: string
  event?: "message" | "suggest" | "do"
  productList?: Product[]
  action?: string
  page?: string
}

interface FormatedMessage {
  role: string
  content: string
  event?: string
  productList?: Product[]
  action?: string
  page?: string
}

interface Conversation {
  id: number
  title: string
  status: "active" | "needs_human" | "archived"
  created_at: string
  messages: {
    role: string
    content: Array<{ text: string }>
  }[]
}

interface Product {
  id: number
  title?: string
  quantity?: number
  price?: number
  description?: string
  image?: string
}

interface AssistantResponse {
  event: "message" | "suggest" | "do"
  message: string
  productList?: Product[]
  action?: string
  page?: string
}

interface ApiResponse {
  assistantResponse: AssistantResponse | string
  conversation: Conversation
}

interface AuthData {
  loggedIn: boolean
  username?: string
  role?: string
}

interface ApiErrorResponse {
  message: string
  status: number
}

interface CartAction {
  selectedPrice?: number
  productId?: number
  action: "add" | "remove"
  quantity: number
}

// API functions
const api = {
  checkAuth: (): Promise<AuthData> => axios.get(`${url}/api/connection`).then(res => res.data),
  getProducts: (): Promise<Product[]> => axios.get(`${url}/api/products`).then(res => res.data),
  getConversations: (): Promise<Conversation[]> => axios.get(`${url}/api/chat`).then(res => res.data),
  sendMessage: (data: { id: number | null, message: { text: string } }): Promise<ApiResponse> =>
    axios.post(`${url}/api/chat`, data).then(res => res.data),
  updateCart: (cartAction: CartAction): Promise<any> =>
    axios.post(`${url}/api/cart`, cartAction).then(res => res.data)
}

const ChatScreen: React.FC = () => {
  const queryClient = useQueryClient()
  const router = useRouter()

  // Chat state
  const [messages, setMessages] = useState<Message[] | FormatedMessage[]>([])
  const [inputText, setInputText] = useState("")
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [conversationTitle, setConversationTitle] = useState("")
  const [conversationStatus, setConversationStatus] = useState<"active" | "needs_human" | "archived">("active")
  const [showConversationsList, setShowConversationsList] = useState(false)

  // Refs
  const messagesScrollRef = useRef<ScrollView>(null)

  // Check authentication
  const { data: authData, isLoading: authLoading } = useQuery({
    queryKey: ["auth"],
    queryFn: api.checkAuth,
    staleTime: 5 * 60 * 1000,
    retry: false,
    //@ts-ignore
    onError: () => {
      // Redirect to login if auth check fails
      router.push("/auth/login")
    }
  })

  //@ts-ignore
  const isConnected = authData?.loggedIn || false

  // Redirect if not connected
  useEffect(() => {
    if (!authLoading && !isConnected) {
      router.push("/auth/login")
    }
  }, [authLoading, isConnected, router])

  // Get products
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: api.getProducts,
    enabled: isConnected,
    staleTime: 5 * 60 * 1000,
  })

  // Get conversations
  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["conversations"],
    queryFn: api.getConversations,
    enabled: isConnected,
    staleTime: 1 * 60 * 1000,
  })

  // Send message mutation
  const messageMutation = useMutation<ApiResponse, Error, { id: number | null; message: { text: string } }>({
    mutationFn: api.sendMessage,
    onSuccess: (data) => {
      // Update conversations list
      queryClient.invalidateQueries({ queryKey: ["conversations"] })

      const { assistantResponse, conversation } = data
      let parsedResponse: AssistantResponse

      // Check if assistantResponse is already an object
      if (typeof assistantResponse === "object" && assistantResponse !== null) {
        parsedResponse = assistantResponse as AssistantResponse
      } else {
        try {
          parsedResponse = JSON.parse(assistantResponse as string)
        } catch (error) {
          console.error("Error parsing JSON response:", error)
          // Fallback to raw response
          parsedResponse = {
            event: "message",
            message: assistantResponse as string
          }
        }
      }

      // Update conversation info
      setConversationId(conversation.id)
      setConversationTitle(conversation.title)
      setConversationStatus(conversation.status)

      // Process the response based on event type
      if (parsedResponse.event === "do") {
        // Log action for "do" events
        console.log("Action:", parsedResponse.action)

        if (parsedResponse.productList && parsedResponse.productList.length > 0) {
          switch (parsedResponse.action) {
            case "add to cart":
              Promise.all(parsedResponse.productList.map(async (product) => {
                const res = await api.updateCart({
                  selectedPrice: product.id,
                  action: "add",
                  quantity: product.quantity || 1
                })

                return res
              }))
                .then((results) => {
                  console.log("Products added to cart:", results)
                  queryClient.invalidateQueries({ queryKey: ["cart"] })
                })
                .catch((error) => {
                  console.error("Error adding products to cart:", error)
                })
              break

            case "remove from cart":
              Promise.all(parsedResponse.productList.map(async (product) => {
                const res = await api.updateCart({
                  productId: product.id,
                  action: "remove",
                  quantity: product.quantity || 1
                })

                return res
              }))
                .then((results) => {
                  console.log("Products removed from cart:", results)
                  queryClient.invalidateQueries({ queryKey: ["cart"] })
                })
                .catch((error) => {
                  console.error("Error removing products from cart:", error)
                })
              break

            default:
              console.log("Unknown action:", parsedResponse.action)
              break
          }
        }

        // Handle navigation
        if (parsedResponse.action === "go to page" && parsedResponse.page) {
          console.log("Redirection to:", parsedResponse.page)
          router.push(parsedResponse.page as any)
        }

        // Enrich product list with full product data if needed
        let enrichedProductList = parsedResponse.productList

        if (parsedResponse.productList && products.length > 0) {
          enrichedProductList = parsedResponse.productList.map(item => {
            // Try to find the full product data by ID
            const fullProduct = products.find(p => p.id === item.id)

            if (fullProduct) {
              return { ...item, title: fullProduct.title }
            }

            return item
          })
        }

        // Add assistant response to chat
        setMessages(prev => [...prev, {
          role: "assistant",
          content: parsedResponse.message,
          event: parsedResponse.event,
          productList: enrichedProductList || parsedResponse.productList,
          action: parsedResponse.action,
          page: parsedResponse.page
        }])
      } else if (parsedResponse.event === "message") {
        // Handle "message" events
        setMessages(prev => [...prev, {
          role: "assistant",
          content: parsedResponse.message
        }])
      } else if (parsedResponse.event === "suggest") {
        // Handle "suggest" events
        // Enrich product list with full product data if needed
        let enrichedProductList = parsedResponse.productList

        if (parsedResponse.productList && products.length > 0) {
          enrichedProductList = parsedResponse.productList.map(item => {
            // Try to find the full product data by ID
            const fullProduct = products.find(p => p.id === item.id)

            if (fullProduct) {
              return { ...item, title: fullProduct.title }
            }

            return item
          })
        }

        setMessages(prev => [...prev, {
          role: "assistant",
          content: parsedResponse.message,
          event: parsedResponse.event,
          productList: enrichedProductList || parsedResponse.productList
        }])
      }
    },
    onError: (error) => {
      console.error("Error sending message:", error)
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: "Désolé, je n'ai pas pu traiter votre demande. Veuillez réessayer plus tard."
        }
      ])
    }
  })

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesScrollRef.current) {
      setTimeout(() => {
        messagesScrollRef.current?.scrollToEnd({ animated: true })
      }, 100)
    }
  }, [messages])

  // Initialize chat with a welcome message for new conversations
  useEffect(() => {
    if (messages.length === 0 && !conversationId && isConnected) {
      setMessages([
        {
          role: "assistant",
          content: "Bonjour ! Comment puis-je vous aider avec nos solutions de cybersécurité aujourd'hui ?"
        }
      ])
    }
  }, [messages.length, conversationId, isConnected])

  // Start a new conversation
  const startNewConversation = () => {
    setConversationId(null)
    setConversationTitle("")
    setConversationStatus("active")
    setMessages([
      {
        role: "assistant",
        content: "Bonjour ! Comment puis-je vous aider avec nos solutions de cybersécurité aujourd'hui ?"
      }
    ])
    setShowConversationsList(false)
  }

  // Load an existing conversation
  const loadConversation = (conversation: Conversation) => {
    try {
      setConversationId(conversation.id)
      setConversationTitle(conversation.title)
      setConversationStatus(conversation.status)

      // Format the messages from the conversation to match our expected format
      const formattedMessages = conversation.messages.map(msg => {
        if (msg.role === "assistant") {
          try {
            // Try to parse the assistant's message if it's JSON
            const parsedContent = typeof msg.content[0].text === "string"
              ? JSON.parse(msg.content[0].text)
              : msg.content[0].text

            return {
              role: "assistant",
              content: parsedContent.message,
              event: parsedContent.event,
              productList: parsedContent.productList,
              action: parsedContent.action,
              page: parsedContent.page
            }
          } catch (error) {
            // If parsing fails, just use the text content
            return {
              role: "assistant",
              content: msg.content[0].text
            }
          }
        } else {
          // User message
          return {
            role: "user",
            content: msg.content[0].text
          }
        }
      })

      setMessages(formattedMessages)
      setShowConversationsList(false)
    } catch (error) {
      console.error("Error loading conversation:", error)
    }
  }

  // Send a message
  const sendMessage = () => {
    if (!inputText.trim() || messageMutation.isPending) return

    // Add user message to the chat
    const userMessage: Message = {
      role: "user",
      content: inputText
    }

    setMessages(prev => [...prev, userMessage])
    setInputText("")
    Keyboard.dismiss()

    // Send message to the API using mutation
    messageMutation.mutate({
      id: conversationId,
      message: { text: inputText }
    })
  }

  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date)
  }

  // Get status icon based on conversation status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "needs_human":
        return <AlertTriangle size={16} color="#F59E0B" />
      case "active":
        return <MessageSquare size={16} color="#10B981" />
      default:
        return <Clock size={16} color="#6B7280" />
    }
  }

  const goToProductDetail = (productId: number) => {
    router.navigate(`/product/${productId}`)
    // router.push(`/product/${productId}`)
  }

  // Component to render product suggestions
  interface ProductSuggestionsProps {
    productList: Product[]
  }


  const ProductSuggestions: React.FC<ProductSuggestionsProps> = ({ productList }) => {
    if (!productList || productList.length === 0) return null

    return (
      <View className="mt-2 space-y-2">
        <Text className="font-medium text-gray-800">Produits suggérés:</Text>
        <View className="space-y-2">
          {productList.map((productItem, index) => {
            // Get full product data if available
            const fullProduct = products.find(p => p.id === productItem.id)
            const productTitle = fullProduct ? fullProduct.title : (productItem.title || `Produit ${productItem.id}`)

            return (
              <TouchableOpacity
                key={index}
                className="bg-white border border-gray-200 rounded-lg p-3 flex-row justify-between items-center"
                onPress={() => goToProductDetail(productItem.id)}
              >
                <View>
                  <Text className="font-medium text-gray-800">{productTitle}</Text>
                  {productItem.quantity && (
                    <Text className="text-sm text-gray-600">× {productItem.quantity}</Text>
                  )}
                </View>
                <ExternalLink size={16} color="#6B7280" />
              </TouchableOpacity>
            )
          })}
        </View>
      </View>
    )
  }

  // Component to render conversation history
  const ConversationsList: React.FC = () => {
    if (!conversations || conversations.length === 0) {
      return (
        <View className="flex-1 p-4 items-center justify-center">
          <Text className="text-gray-500">Aucune conversation</Text>
        </View>
      )
    }

    return (
      <View className="flex-1">
        <TouchableOpacity
          className="flex-row items-center justify-center gap-2 p-3 bg-purple-800 rounded-lg mx-4 mt-2"
          onPress={startNewConversation}
        >
          <PlusCircle size={20} color="#FFFFFF" />
          <Text className="text-white font-bold">Nouvelle conversation</Text>
        </TouchableOpacity>

        <Text className="text-sm font-medium text-gray-500 p-4 pb-2">Conversations récentes</Text>
        <ScrollView className="flex-1">
          {conversations.map((conversation: Conversation) => (
            <TouchableOpacity
              key={conversation.id}
              className={`flex-row items-start p-3 border-b border-gray-100 mx-2 ${conversationId === conversation.id ? "bg-gray-100" : ""
                }`}
              onPress={() => loadConversation(conversation)}
            >
              <View className="mr-2 mt-1">{getStatusIcon(conversation.status)}</View>
              <View className="flex-1">
                <Text className="font-medium text-gray-800 mb-1" numberOfLines={1}>
                  {conversation.title}
                </Text>
                <Text className="text-xs text-gray-500">
                  {formatDate(conversation.created_at)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    )
  }

  // Render a chat message
  const renderMessage = (message: Message, index: number) => {
    if (message.role === "user") {
      return (
        <View key={index} className="bg-purple-800 p-3 rounded-lg self-end max-w-[80%] mb-2">
          <Text className="text-white">{message.content}</Text>
        </View>
      )
    }

    return (
      <View key={index} className="self-start max-w-[80%] mb-2">
        <View className="bg-gray-200 p-3 rounded-lg">
          <Markdown>{message.content}</Markdown>
        </View>

        {/* Show product suggestions for "suggest" events */}
        {message.event === "suggest" && message.productList && (
          <ProductSuggestions productList={message.productList} />
        )}
      </View>
    )
  }

  // Show loading indicator while auth is checking
  if (authLoading) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text className="mt-4 text-gray-600">Vérification de la connexion...</Text>
      </SafeAreaView>
    )
  }

  // If not connected, the useEffect will redirect to login

  return (
    <SafeAreaView edges={['top']} className="flex-1 ">
      {/* Header */}
      <View className="bg-purple-800 flex-row items-center justify-between p-4">
        <View className="flex-row items-center">


          {showConversationsList ? (
            <Text className="text-white font-bold text-lg">Conversations</Text>
          ) : (
            <>
              <TouchableOpacity
                onPress={() => setShowConversationsList(true)}
                className="mr-2 flex flex-row gap-2 flex-nowrap"
              >
                <MessageSquare size={24} color="#FFFFFF" />
                <Text className="text-white font-bold text-lg" numberOfLines={1}>
                  {`${conversationTitle.slice(0, 20)}${conversationTitle.length > 20 && "..."}` || "Chat bot"}
                </Text>
              </TouchableOpacity>
              {conversationStatus === "needs_human" && (
                <View className="bg-amber-100 rounded-full px-2 py-1 ml-2">
                  <Text className="text-amber-800 text-xs">Assistance humaine</Text>
                </View>
              )}
            </>
          )}
        </View>

        {!showConversationsList && conversationId && (
          <TouchableOpacity
            onPress={startNewConversation}
            className="p-1"
          >
            <PlusCircle size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Main content */}
      {showConversationsList ? (
        <ConversationsList />
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 pb-0"
          keyboardVerticalOffset={0}
        >
          <ScrollView
            ref={messagesScrollRef}
            className="flex-1 p-4 "
            contentContainerStyle={{ flexGrow: 1 }}
          >
            {/*@ts-ignore*/}
            {messages.map((message, index) => renderMessage(message, index))}

            {messageMutation.isPending && (
              <View className="bg-gray-200 p-3 rounded-lg self-start max-w-[50%] mb-2">
                <View className="flex-row gap-1">
                  <View className="w-2 h-2 bg-gray-400 rounded-full" style={{ opacity: 0.6 }} />
                  <View className="w-2 h-2 bg-gray-400 rounded-full" style={{ opacity: 0.8 }} />
                  <View className="w-2 h-2 bg-gray-400 rounded-full" style={{ opacity: 1 }} />
                </View>
              </View>
            )}
          </ScrollView>

          <View className="p-2 border-t border-gray-200 bg-purple-800">
            <View className="flex-row">
              <TextInput
                className="flex-1 bg-white p-2 rounded-lg"
                placeholder="Tapez votre message ici"
                value={inputText}
                onChangeText={setInputText}
                multiline={false}
                maxLength={1000}
                editable={!messageMutation.isPending}
              />
              <TouchableOpacity
                className={`ml-2 rounded-full justify-center ${!inputText.trim() || messageMutation.isPending ? "opacity-50" : ""
                  }`}
                onPress={sendMessage}
                disabled={!inputText.trim() || messageMutation.isPending}
              >
                <View className="bg-white p-2 rounded-full">
                  <Send size={24} color="#7C3AED" />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  )
}

export default ChatScreen