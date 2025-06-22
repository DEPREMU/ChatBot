import { StyleSheet } from "react-native";

export const useStylesButtonComponent = () => {
  return StyleSheet.create({
    button: {
      backgroundColor: "#007BFF",
      padding: 10,
      borderRadius: 5,
      marginVertical: 10,
    },
    textButton: {
      color: "#FFFFFF",
      fontSize: 16,
      textAlign: "center",
      fontWeight: "bold",
    },
  });
};
