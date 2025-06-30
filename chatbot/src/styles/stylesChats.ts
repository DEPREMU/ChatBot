import { useResponsiveLayout } from "@/context/LayoutContext";
import { StyleSheet } from "react-native";

const useStylesChats = () => {
  const { isPhone, isWeb } = useResponsiveLayout();

  const styles = StyleSheet.create({
    mainContainer: {
      flex: 1,
      backgroundColor: "#f9f9f9",
      alignItems: "center",
    },
    container: {
      flex: 1,
      paddingHorizontal: isPhone ? 12 : 24,
      paddingTop: 16,
      backgroundColor: "#fff",
    },
    chatCard: {
      backgroundColor: "#f2f2f2",
      borderRadius: 12,
      padding: 12,
      marginBottom: 16,
      flexDirection: "column",
      justifyContent: "space-between",
      position: "relative",
      elevation: 2, // for Android shadow
      shadowColor: "#000", // for iOS shadow
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
    },
    title: {
      fontSize: isPhone ? 16 : 18,
      fontWeight: "500",
      marginLeft: 8,
      overflow: "hidden",
      flexShrink: 1,
      flexWrap: "wrap",
      color: "#333",
    },
    timestamp: {
      position: "absolute",
      bottom: 8,
      right: 12,
      fontSize: 12,
      color: "#666",
    },
  });

  return { styles, isPhone, isWeb };
};

export default useStylesChats;
