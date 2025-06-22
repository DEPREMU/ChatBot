import { Dimensions, Platform, ScaledSize } from "react-native";
import React, { createContext, useContext, useState, useEffect } from "react";

interface LayoutProviderProps {
  children: any;
}

/**
 * LayoutContext provides information about the current layout of the application,
 * including device type and dimensions.
 *
 * It allows components to access responsive layout data for better UI adaptation.
 *
 * @context
 * @returns {LayoutContextProps} The context value containing layout information.
 */
const LayoutContext = createContext({
  isTablet: false,
  isLargeTablet: false,
  isPhone: false,
  isWeb: false,
  width: 0,
  height: 0,
});

/**
 * Provides layout-related context values to its children, such as device type and screen dimensions.
 *
 * @param {LayoutProviderProps} props - The props for the LayoutProvider component.
 * @param {React.ReactNode} props.children - The child components that will have access to the layout context.
 *
 * @const {ScaledSize} dimensions - The current window dimensions, updated on screen size changes.
 * @const {(dimensions: ScaledSize) => void} setDimensions - Setter function to update the window dimensions state.
 * @const {number} width - The current width of the window.
 * @const {number} height - The current height of the window.
 * @const {boolean} isWeb - Indicates if the platform is web.
 * @const {boolean} isPhone - Indicates if the device is considered a phone (width <= 768 and height <= 1600).
 * @const {boolean} isTablet - Indicates if the device is considered a tablet (width > 768 and height <= 1600).
 * @const {boolean} isLargeTablet - Indicates if the device is considered a large tablet (width > 1024 and height <= 2048).
 * @const {object} layoutData - The object containing all layout-related values provided to the context.
 */
export const LayoutProvider: React.FC<LayoutProviderProps> = ({ children }) => {
  const [dimensions, setDimensions] = useState(Dimensions.get("window"));

  useEffect(() => {
    const onChange = ({ window }: { window: ScaledSize }) => {
      setDimensions(window);
    };
    const subscription = Dimensions.addEventListener("change", onChange);

    return () => subscription?.remove();
  }, []);

  const { width, height } = dimensions;
  const isPlatformWeb = Platform.OS === "web";
  const isPortrait: boolean = height >= width;
  const isLandscape: boolean = width > height;

  const isWeb: boolean = isPlatformWeb && width > 768;
  const isPhone: boolean = width <= 768;
  const isTablet: boolean = width > 768;
  const isLargeTablet: boolean = width > 1024 && height <= 2048;

  const layoutData = {
    isWeb,
    isPhone,
    isPortrait,
    isLargeTablet,
    isPlatformWeb,
    isLandscape,
    isTablet,
    height,
    width,
  };

  return (
    <LayoutContext.Provider value={layoutData}>
      {children}
    </LayoutContext.Provider>
  );
};

/**
 * Custom hook to access the layout context values.
 *
 * @returns {LayoutContextProps} The layout context values.
 *
 * @throws {Error} If used outside of a LayoutProvider.
 */
export const useResponsiveLayout = () => {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error(
      "useResponsiveLayout debe ser usado dentro de un LayoutProvider"
    );
  }
  return context;
};
