import React, { useState, useEffect, useRef } from "react";
import Constants from "expo-constants";
import {
  View,
  Text,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  TouchableOpacity,
  Modal,
  Platform,
  Alert,
} from "react-native";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import axios from "axios";
import { useRouter } from "expo-router";

const url = Constants.expoConfig?.extra?.apiUrl;

const loginSchema = yup.object().shape({
  email: yup.string().email("Email invalide").required("Email requis"),
  password: yup.string().required("Mot de passe requis"),
});

const otpSchema = yup.object().shape({
  otp: yup
    .string()
    .matches(/^[0-9]{6}$/, "Le code OTP doit contenir 6 chiffres")
    .required("OTP requis"),
});

const Login = () => {
  const router = useRouter();
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const intervalRef = useRef(null);

  const {
    control: mainControl,
    handleSubmit: handleMainSubmit,
    formState: { errors: mainErrors },
    getValues: getMainValues,
  } = useForm({
    resolver: yupResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const {
    control: otpControl,
    handleSubmit: handleOtpSubmit,
    formState: { errors: otpErrors },
    watch: watchOtp,
    reset: resetOtp,
  } = useForm({
    resolver: yupResolver(otpSchema),
    defaultValues: {
      otp: "",
    },
  });

  const otp = watchOtp("otp");

  useEffect(() => {
    if (otp?.length === 6) {
      handleOtpSubmit(submitOtp)();
    }
  }, [otp]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const startTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setRemainingTime(60);

    intervalRef.current = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const sendCredentialsAndOTP = async (data) => {
    if (loading) return;

    try {
      setLoading(true);
      setMessage("");

      await axios.post(`${url}/api/user/sendOTP`, { email: data.email });

      setOtpModalVisible(true);
      resetOtp();
      startTimer();
      setMessage("Un code OTP vous a été envoyé par email");
    } catch (error) {
      Alert.alert(
        "Erreur",
        error.response?.data?.message || "Erreur lors de l'envoi de l'OTP"
      );
    } finally {
      setLoading(false);
    }
  };

  const resendOTP = async () => {
    if (remainingTime > 0 || loading) return;

    try {
      setLoading(true);
      const email = getMainValues("email");
      await axios.post(`${url}/api/user/sendOTP`, { email });

      startTimer();
      setMessage("Un nouveau code OTP vous a été envoyé");
    } catch (error) {
      Alert.alert(
        "Erreur",
        error.response?.data?.message || "Erreur lors de l'envoi de l'OTP"
      );
    } finally {
      setLoading(false);
    }
  };

  const submitOtp = async (otpData) => {
    if (loading) return;

    try {
      setLoading(true);
      const { email, password } = getMainValues();
      const { otp } = otpData;

      const loginData = {
        email,
        password,
        otp,
      };

      const response = await axios.post(`${url}/api/user/login`, loginData);

      setOtpModalVisible(false);

      Alert.alert("Succès", response.data.message);
      router.push("/");
    } catch (error) {
      Alert.alert(
        "Erreur",
        error.response?.data?.message ||
          "Une erreur est survenue lors de la connexion"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 p-5 justify-center bg-white"
    >
      <Text className="text-2xl font-bold mb-5 text-center">Login</Text>

      <Controller
        control={mainControl}
        name="email"
        render={({ field: { onChange, value } }) => (
          <View className="mb-4">
            <TextInput
              className="border border-gray-300 rounded-lg p-3 bg-gray-50 text-base"
              placeholder="Email"
              value={value}
              onChangeText={onChange}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {mainErrors.email && (
              <Text className="text-red-600 mt-1 text-sm">
                {mainErrors.email.message}
              </Text>
            )}
          </View>
        )}
      />

      <Controller
        control={mainControl}
        name="password"
        render={({ field: { onChange, value } }) => (
          <View className="mb-4">
            <TextInput
              className="border border-gray-300 rounded-lg p-3 bg-gray-50 text-base"
              placeholder="Mot de passe"
              value={value}
              onChangeText={onChange}
              secureTextEntry
            />
            {mainErrors.password && (
              <Text className="text-red-600 mt-1 text-sm">
                {mainErrors.password.message}
              </Text>
            )}
          </View>
        )}
      />

      <TouchableOpacity
        className={`rounded-lg p-4 items-center mt-2 ${
          loading ? "bg-gray-400" : "bg-blue-500"
        }`}
        onPress={handleMainSubmit(sendCredentialsAndOTP)}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text className="text-white font-bold text-base">Se connecter</Text>
        )}
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={otpModalVisible}
        onRequestClose={() => setOtpModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black bg-opacity-50">
          <View className="w-4/5 bg-white rounded-xl p-5 shadow-lg">
            <Text className="text-xl font-bold mb-4 text-center">
              Vérification en deux étapes
            </Text>

            {message && (
              <Text className="bg-blue-50 p-3 rounded-lg my-3 text-blue-800 text-center">
                {message}
              </Text>
            )}

            <Controller
              control={otpControl}
              name="otp"
              render={({ field: { onChange, value } }) => (
                <View className="mb-4">
                  <Text className="mb-2 text-base font-medium">
                    Entrez le code reçu par email
                  </Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg p-3 bg-gray-50 text-lg text-center font-bold tracking-wider"
                    placeholder="Code OTP à 6 chiffres"
                    value={value}
                    onChangeText={onChange}
                    keyboardType="numeric"
                    maxLength={6}
                    autoFocus
                  />
                  {otpErrors.otp && (
                    <Text className="text-red-600 mt-1 text-sm">
                      {otpErrors.otp.message}
                    </Text>
                  )}
                </View>
              )}
            />

            <View className="mt-2">
              <TouchableOpacity
                className={`rounded-lg p-4 items-center mb-3 ${
                  loading ? "bg-gray-400" : "bg-blue-500"
                }`}
                onPress={handleOtpSubmit(submitOtp)}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text className="text-white font-bold text-base">
                    Valider
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                className={`rounded-lg p-4 items-center mb-3 ${
                  remainingTime > 0 || loading ? "bg-gray-200" : "bg-gray-100"
                } border border-gray-300`}
                onPress={resendOTP}
                disabled={remainingTime > 0 || loading}
              >
                <Text className="text-gray-700 font-bold text-base">
                  {remainingTime > 0
                    ? `Renvoyer (${remainingTime}s)`
                    : "Renvoyer OTP"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="rounded-lg p-4 items-center"
                onPress={() => setOtpModalVisible(false)}
              >
                <Text className="text-red-500 font-bold text-base">
                  Annuler
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

export default Login;
