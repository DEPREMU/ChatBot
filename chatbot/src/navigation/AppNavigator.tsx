import {
  createNativeStackNavigator,
  NativeStackNavigationOptions,
  NativeStackNavigationProp,
} from "@react-navigation/native-stack";
import React from "react";
import ChatBot from "@screens/Chatbot";
import { RootStackParamList } from "./navigationTypes";
import { BackgroundTaskProvider } from "@context/BackgroundTaskContext";
import { NavigationContainer, RouteProp } from "@react-navigation/native";

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

const AppNavigator: React.FC = () => (
  <NavigationContainer>
    <BackgroundTaskProvider>
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
    </BackgroundTaskProvider>
  </NavigationContainer>
);

export default AppNavigator;
