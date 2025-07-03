import {
  createNativeStackNavigator,
  NativeStackNavigationOptions,
  NativeStackNavigationProp,
} from "@react-navigation/native-stack";
import React, { use, useEffect, useState } from "react";
import ChatBot from "@screens/Chatbot";
import { RootStackParamList } from "./navigationTypes";
import { BackgroundTaskProvider } from "@context/BackgroundTaskContext";
import { NavigationContainer, RouteProp } from "@react-navigation/native";
import { Appbar, BottomNavigation, Switch, Text } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { loadData, log, saveData } from "@/utils";
import { View } from "react-native";
import Chats from "@/screens/Chats";
import { useLanguage } from "@/context/LanguageContext";
import Settings from "@/screens/Settings";

const Stack = createNativeStackNavigator<RootStackParamList>();

type Screens = Record<
  keyof RootStackParamList,
  {
    component: React.ComponentType<any>;
    options?:
      | NativeStackNavigationOptions
      | ((props: {
          route: RouteProp<RootStackParamList, "chatbot">;
          navigation: NativeStackNavigationProp<
            RootStackParamList,
            "chatbot",
            undefined
          >;
          theme: ReactNavigation.Theme;
        }) => NativeStackNavigationOptions);
  }
>;

/**
 * Centralized configuration object for all app screens.
 * This improves maintainability and scalability by allowing easy management of screen components and their options.
 * Add new screens or modify existing ones here to keep navigation logic clean and organized.
 */
const screens: Screens = {
  chatbot: { component: ChatBot },
};

class Chat {
  constructor(chatId?: string) {
    this.chatId = chatId || Math.random().toString(36).substring(2, 15);
  }

  chatId: string;

  setChatId(chatId: string) {
    this.chatId = chatId;
  }

  getChatId() {
    return this.chatId;
  }
}

const handleGetChatId = () => {
  const chatInstance = new Chat();
  return chatInstance.getChatId();
};

const AppNavigator: React.FC = () => {
  const { translations } = useLanguage();
  const getRoutes = () => [
    { key: "chatbot", title: "Chatbot", focusedIcon: "chat" },
    { key: "chats", title: translations.chats, focusedIcon: "history" },
    { key: "settings", title: translations.settings, focusedIcon: "cog" },
  ];

  const [index, setIndex] = useState<number>(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [chatId, setChatId] = useState<string>(handleGetChatId());
  const [isDevMode, setIsDevMode] = useState<boolean>(true);
  const [titleChat, setTitleChat] = useState<string>("MediBot");
  const [routes, setRoutes] = useState(getRoutes());

  useEffect(() => setRoutes(getRoutes()), [translations]);

  useEffect(() => {
    if (index === 0) return;
    setIndex(0);
  }, [chatId]);

  const renderScene = BottomNavigation.SceneMap({
    chatbot: () => (
      <>
        <Appbar.Header>
          <Appbar.Content title={titleChat} />
          <Appbar.Action
            icon="plus"
            onPress={() => {
              setChatId(handleGetChatId());
              setTitleChat("MediBot");
            }}
          />
        </Appbar.Header>

        {!!userId && (
          <ChatBot
            chatId={chatId}
            setTitleChat={setTitleChat}
            userId={userId}
            isDevMode={isDevMode}
          />
        )}
      </>
    ),
    settings: () => (
      <>
        <Appbar.Header>
          <Appbar.Content title={translations.settings} />
        </Appbar.Header>

        <Settings />
      </>
    ),
    chats: () => (
      <>
        <Appbar.Header>
          <Appbar.Content title={translations.chats} />
          <Appbar.Action
            icon="plus"
            onPress={() => {
              setChatId(Math.random().toString(36).substring(2, 15));
            }}
          />
        </Appbar.Header>

        {!!userId && (
          <Chats
            userId={userId}
            setChatId={setChatId}
            setTitleChat={setTitleChat}
          />
        )}
      </>
    ),
  });

  useEffect(() => {
    const fetchUserId = async () => {
      let storedUserId = await loadData<string | null>("@userId");

      try {
        if (!storedUserId) {
          storedUserId = "6854690a35908648e376e2ad";
          await saveData("@userId", storedUserId);
        }
        setUserId(storedUserId);
      } catch (error) {
        console.error("Error loading user ID:", error);
      }
      return storedUserId;
    };

    document?.addEventListener("keydown", (e) => {
      if (e.key === "F9") setIsDevMode((prev) => !prev);
    });

    fetchUserId();

    return () => {
      document?.removeEventListener("keydown", (e) => {
        if (e.key === "F9") setIsDevMode((prev) => !prev);
      });
    };
  }, []);

  return (
    <NavigationContainer>
      <BackgroundTaskProvider>
        <SafeAreaProvider>
          <BottomNavigation
            navigationState={{ index, routes }}
            onIndexChange={setIndex}
            renderScene={renderScene}
          />
        </SafeAreaProvider>
      </BackgroundTaskProvider>
    </NavigationContainer>
  );
};
/*
<Stack.Navigator initialRouteName="chatbot">
        {Object.entries(screens).map(([name, { component, options }]) => (
          <Stack.Screen
            key={name}
            name={name as keyof RootStackParamList}
            component={component}
            options={
              (options as NativeStackNavigationOptions) ?? {
                headerShown: false,
              }
            }
          />
        ))}
      </Stack.Navigator>
*/

export default AppNavigator;
