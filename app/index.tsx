import Constants from 'expo-constants'
import { Text } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

const url = Constants.expoConfig?.extra?.apiUrl

export default function Index() {

  return (
    <SafeAreaView
      className="h-full bg-red-500 flex flex-col items-center justify-start"
    >
      <Text>Edit app/index.tsx to edit this screen. {url}</Text>
    </SafeAreaView >
  )
}
