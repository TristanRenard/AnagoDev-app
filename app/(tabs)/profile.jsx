import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, ActivityIndicator, TextInput, TouchableOpacity, Alert, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import Constants from "expo-constants";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import PhoneInput from "react-native-phone-number-input";

const url = Constants.expoConfig?.extra?.apiUrl;

const Profile = () => {
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [userAddress, setUserAddress] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editedFields, setEditedFields] = useState({});
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const queryClient = useQueryClient();

  const { isLoading } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const res = await axios(`${url}/api/me`);
      setUser(res.data.user);
      setUserAddress(res.data.userAddress[0]);

      return res.data.user;
    },
  });

  const mutation = useMutation({
    mutationFn: async (modifiedFields) => {
      await Promise.all(
        modifiedFields.map(({ field, editedValue }) =>
          axios.put(`${url}/api/user/modifyDetails`, { field, editedValue })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });

  const handleEdit = (field, value) => {
    setEditedFields((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveAll = () => {
    const modifiedFields = Object.entries(editedFields)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([field, editedValue]) => ({ field, editedValue }));

    if (modifiedFields.length > 0) {
      mutation.mutate(modifiedFields);
    }
    setEditing(false);
    setEditedFields({});
  };

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
      Alert.alert(t("Error"), t("Failed to send account deletion email."));
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
    <ScrollView className="flex-1 bg-gray-100 p-6">
      <View className="bg-white p-6 rounded-2xl shadow flex-row items-center space-x-4 mb-6">
        <View className="bg-purple-100 p-6 rounded-full mr-4">
          <Ionicons name="person" size={40} color="#7c3aed" />
        </View>
        <View>
          <Text className="text-2xl font-bold text-gray-900">
            {user.firstName} {user.lastName}
          </Text>
          <Text className="text-sm text-gray-500">{user.email}</Text>
        </View>
      </View>

      <View className="bg-white p-6 rounded-2xl shadow space-y-4 mb-6">
        <Text className="text-lg font-semibold border-b pb-2 text-gray-700">{t("Personal information")}</Text>

        <View className="divide-y divide-gray-200">
          {[
            { title: t("First name"), value: user.firstName, field: "firstName" },
            { title: t("Last name"), value: user.lastName, field: "lastName" },
            { title: t("Phone number"), value: user.phone, field: "phone" },
            { title: t("Street"), value: userAddress?.street ?? "-", field: "street" },
            { title: t("City"), value: userAddress?.city ?? "-", field: "city" },
            { title: t("State"), value: userAddress?.state ?? "-", field: "state" },
            { title: t("Zip"), value: userAddress?.zip ?? "-", field: "zip" },
            { title: t("Country"), value: userAddress?.country ?? "-", field: "country" },
            { title: t("Complement"), value: userAddress?.complement ?? "-", field: "complement" },
            { title: t("Name"), value: userAddress?.name ?? "-", field: "name" },
            { title: t("Is default"), value: userAddress?.isDefault ? t("True") : t("False"), field: "isDefault" },
          ].map((row, idx) => (
            <ProfileRow
              key={idx}
              title={row.title}
              value={row.value}
              field={row.field}
              editing={editing}
              onEdit={handleEdit}
            />
          ))}
        </View>

        {!editing ? (
          <TouchableOpacity className="mt-4 bg-purple-600 p-3 rounded-md" onPress={() => setEditing(true)}>
            <Text className="text-center text-white font-bold">{t("Modify")}</Text>
          </TouchableOpacity>
        ) : (
          <View className="flex flex-row justify-between mt-4 space-x-4">
            <TouchableOpacity
              className="bg-green-600 p-3 rounded-md w-32"
              onPress={handleSaveAll}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text className="text-center text-white font-bold">{t("Save")}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              className="bg-red-600 p-3 rounded-md w-32"
              onPress={() => {
                setEditing(false);
                setEditedFields({});
              }}
            >
              <Text className="text-center text-white font-bold">{t("Cancel")}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View className="bg-white p-6 rounded-2xl shadow border-t-4 border-red-500 mb-10">
        <Text className="text-lg font-bold text-red-600">{t("Danger Zone")}</Text>
        <Text className="text-sm text-gray-600 mt-2">
          {t("Delete your account permanently. This action cannot be undone.")}
        </Text>

        <TouchableOpacity className="bg-red-500 p-3 rounded-md mt-4" onPress={() => setDeleteModalVisible(true)}>
          <Text className="text-center text-white font-bold">{t("Delete my account")}</Text>
        </TouchableOpacity>

        <Modal
          animationType="slide"
          transparent
          visible={deleteModalVisible}
          onRequestClose={() => setDeleteModalVisible(false)}
        >
          <View className="flex-1 justify-center items-center bg-black/50">
            <View className="bg-white rounded-lg p-6 w-4/5">
              <Text className="text-xl font-bold mb-2">{t("Are you absolutely sure?")}</Text>
              <Text className="text-gray-600 mb-6">
                {t(
                  "This action cannot be undone. This will permanently delete your account and remove your data from our servers."
                )}
              </Text>
              <View className="flex-row space-x-4">
                <TouchableOpacity className="flex-1 bg-red-600 p-3 rounded-md" onPress={sendAccountDeletionEmail}>
                  <Text className="text-center text-white font-bold">{t("Yes, delete it")}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 bg-gray-300 p-3 rounded-md"
                  onPress={() => setDeleteModalVisible(false)}
                >
                  <Text className="text-center text-gray-800 font-bold">{t("Cancel")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </ScrollView>
  );
};

const ProfileRow = ({ title, value, field, editing, onEdit }) => {
  const [inputValue, setInputValue] = useState(value === "-" ? "" : value);

  useEffect(() => {
    setInputValue(value === "-" ? "" : value);
  }, [value]);

  const isPhoneField = field === "phone";

  return (
    <View className="flex-row justify-between py-2">
      <Text className="w-32 text-sm font-bold text-gray-700">{title}</Text>
      {editing && field !== "email" ? (
        isPhoneField ? (
          <PhoneInput
            defaultValue={inputValue}
            defaultCode="FR"
            onChangeFormattedText={(text) => {
              setInputValue(text);
              onEdit(field, text);
            }}
            containerStyle={{ width: 200 }}
          />
        ) : (
          <TextInput
            className="border border-gray-300 rounded-md px-3 py-2 w-48 bg-white text-gray-900 text-sm"
            value={inputValue}
            onChangeText={(text) => {
              setInputValue(text);
              onEdit(field, text);
            }}
          />
        )
      ) : (
        <Text className="text-sm text-gray-900 w-48">{inputValue}</Text>
      )}
    </View>
  );
};

export default Profile;
