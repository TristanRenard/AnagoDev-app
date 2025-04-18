import { Text } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

export default function Index() {
  return (
    <SafeAreaView
      className="h-full bg-red-500 flex flex-col items-center justify-start"
    >
      <Text>Edit app/index.tsx to edit this screen.</Text>
    </SafeAreaView >
  )
}
