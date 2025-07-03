import { StyleSheet } from "react-native";
import { useResponsiveLayout } from "@context/LayoutContext";

const useStylesChatbot = () => {
  const { isPhone, isWeb, isTablet, height, width } = useResponsiveLayout();

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#fefcfb",
      padding: 16,
      justifyContent: "center",
      alignItems: "center",
      height,
      width: "100%",
      maxWidth: isWeb ? 1200 : "100%",
    },
    containerApp: {
      width: "100%",
      height,
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    text: {
      fontSize: 18,
      color: "#4e4e4e",
    },
    button: {
      backgroundColor: "#a0c4ff",
      padding: 10,
      borderRadius: 10,
      alignItems: "center",
    },
    buttonText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "600",
    },
    title: {
      fontSize: isPhone ? 24 : isTablet ? 28 : 32,
      fontWeight: "bold",
      marginBottom: 16,
      textAlign: "center",
      color: "#5e60ce",
    },
    subtitle: {
      fontSize: isPhone ? 18 : isTablet ? 20 : 22,
      color: "#7d8597",
      marginBottom: 8,
      textAlign: "center",
    },
    textInput: {
      width: isWeb ? 600 : isTablet ? 450 : "90%",
      height: 50,
      borderRadius: 8,
      paddingHorizontal: 12,
      marginBottom: 16,
      backgroundColor: "#f1f1f1",
      borderColor: "#d0d0d0",
      borderWidth: 1,
      color: "#333",
    },
    messageContainerUser: {
      backgroundColor: "#d0f4de",
      padding: 10,
      borderRadius: 10,
      marginBottom: 8,
      alignSelf: "flex-end",
      width: isWeb ? "40%" : isTablet ? "70%" : "90%",
    },
    messageContainerBot: {
      backgroundColor: "#f1f0ff",
      padding: 10,
      borderRadius: 10,
      marginBottom: 8,
      alignSelf: "flex-start",
      width: isWeb ? "40%" : isTablet ? "70%" : "90%",
    },
    messageText: {
      fontSize: 16,
      color: "#444",
      marginBottom: 8,
    },
    chatContainer: {
      width: "100%",
      backgroundColor: "#ffffff",
      borderRadius: 12,
      padding: 12,
      flex: 1,
    },
    chatContentContainer: {
      gap: 10,
      paddingBottom: 10,
    },
    dateText: {
      fontSize: 12,
      color: "#a1a1a1",
      textAlign: "right",
    },
    error: {
      backgroundColor: "#ffcccc",
      borderRadius: 10,
      padding: 10,
      width: "100%",
    },
    errorText: {
      color: "#d8000c",
      fontSize: 14,
      textAlign: "center",
    },
    buttonError: {
      width: "100%",
      justifyContent: "flex-start",
    },
    resetImage: {
      width: 20,
      height: 20,
    },
    inputContainer: {
      width: "100%",
      flexDirection: "row",
      gap: 5,
      justifyContent: "center",
      alignItems: "center",
    },
    buttonSend: {
      padding: 10,
      borderRadius: 10,
      alignItems: "center",
      width: 50,
      height: "100%",
      justifyContent: "center",
    },
    input: {
      width: "90%",
      borderRadius: 8,
      paddingHorizontal: 12,
      backgroundColor: "#f1f1f1",
      borderColor: "#d0d0d0",
      borderWidth: 1,
      color: "#333",
    },
  });
};

export default useStylesChatbot;
