import React, { useState } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Modal, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import Constants from "expo-constants";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PhoneInput from "react-native-phone-number-input";
import { useTranslation } from "react-i18next";

const url = Constants.expoConfig?.extra?.apiUrl;

const Profile = () => {
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [userAddress, setUserAddress] = useState(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  const { isLoading } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const res = await axios(`${url}/api/me`);
      setUser(res.data.user);
      setUserAddress(res.data.userAddress[0]);

      return;
    },
  });

  const sendAccountDeletionEmail = async () => {
    try {
      const res = await axios.post(`${url}/api/user/accountDeletion`, {
        email: user.email,
      });
      if (res.status === 200) {
        Alert.alert(t("Success"), t("Account deletion email sent."));
        setDeleteModalVisible(false);
      }
    } catch (error) {
      Alert.alert(t("Error"), t("Failed to send account deletion email"));
    }
  };

  if (isLoading || !user) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text className="text-gray-600 mt-4">{t("Loading...")}</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50 px-4 pt-6">
      <View className="bg-white p-6 gap-4 rounded-2xl flex-row items-center space-x-4 shadow-lg">
        <View className="bg-purple-100 p-4 rounded-full">
          <Ionicons name="person" size={32} color="#7c3aed" />
        </View>
        <View>
          <Text className="text-xl font-bold text-gray-900">
            {user.firstName} {user.lastName}
          </Text>
          <Text className="text-sm text-gray-500">{user.email}</Text>
        </View>
      </View>

      <View className="bg-white mt-6 rounded-2xl p-6 shadow-lg space-y-4">
        <Text className="text-lg font-bold text-gray-800">{t("Personal information")}</Text>

        <View className="space-y-4">
          <ProfileRow title={t("First name")} value={user.firstName} field="firstName" />
          <ProfileRow title={t("Last name")} value={user.lastName} field="lastName" />
          <ProfileRow title={t("Phone number")} value={user.phone} field="phone" />

          <View className="border-t border-gray-200 my-2" />

          <ProfileRow title={t("Street")} value={userAddress?.street ?? "-"} field="street" />
          <ProfileRow title={t("City")} value={userAddress?.city ?? "-"} field="city" />
          <ProfileRow title={t("State")} value={userAddress?.state ?? "-"} field="state" />
          <ProfileRow title={t("Zip")} value={userAddress?.zip ?? "-"} field="zip" />
          <ProfileRow title={t("Country")} value={userAddress?.country ?? "-"} field="country" />
          <ProfileRow title={t("Complement")} value={userAddress?.complement ?? "-"} field="complement" />
          <ProfileRow title={t("Name")} value={userAddress?.name ?? "-"} field="name" />
          <ProfileRow
            title={t("Is default")}
            value={userAddress?.isDefault ? t("True") : t("False")}
            field="isDefault"
          />
        </View>
      </View>

      <View className="bg-red-50 mt-6 p-6 rounded-2xl border border-red-400 shadow">
        <Text className="text-red-700 font-bold text-lg">{t("Danger Zone")}</Text>
        <Text className="text-sm text-red-600 mt-2">
          {t("Delete your account permanently. This action cannot be undone.")}
        </Text>
        <TouchableOpacity className="mt-4 bg-red-600 rounded-md px-4 py-2" onPress={() => setDeleteModalVisible(true)}>
          <Text className="text-white text-center font-semibold">{t("Delete my account")}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const ProfileRow = ({ title, value, field }) => {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [editedValue, setEditedValue] = useState(value);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      await axios.put(`${url}/api/user/modifyDetails`, {
        field,
        editedValue,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });

  const handleSave = () => {
    if (editedValue && editedValue !== value) {
      mutation.mutate();
    }
    setIsEditing(false);
  };

  return (
    <View className="mb-4 flex-row justify-between">
      <Text className="text-sm font-medium text-gray-700 mb-1">{title}</Text>
      {isEditing && field !== "email" ? (
        field === "phone" ? (
          <PhoneInput
            defaultValue={editedValue}
            defaultCode="FR"
            onChangeFormattedText={(text) => setEditedValue(text)}
            containerStyle={{ marginBottom: 8 }}
          />
        ) : (
          <TextInput
            className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 bg-white"
            value={editedValue}
            onChangeText={setEditedValue}
            autoFocus
          />
        )
      ) : (
        <Text className="text-gray-900 text-sm">{editedValue}</Text>
      )}
      {field !== "email" && (
        <View className="flex-row gap-4 space-x-4 mt-2">
          {isEditing ? (
            <>
              <TouchableOpacity
                onPress={handleSave}
                disabled={mutation.isPending}
                className="px-3 py-1 bg-green-100 rounded-md"
              >
                {mutation.isPending ? (
                  <ActivityIndicator size="small" />
                ) : (
                  <Text className="text-green-700 font-medium">{t("Save")}</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setEditedValue(value);
                  setIsEditing(false);
                }}
                className="px-3 py-1 bg-red-100 rounded-md"
              >
                <Text className="text-red-600 font-medium">{t("Cancel")}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity onPress={() => setIsEditing(true)} className="px-3 py-1 bg-blue-100 rounded-md">
              <Text className="text-blue-600 font-medium">{t("Modify")}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

export default Profile;
