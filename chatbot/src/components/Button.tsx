import {
  Text,
  Pressable,
  TargetedEvent,
  NativeMouseEvent,
  NativeSyntheticEvent,
} from "react-native";
import React from "react";
import { useStylesButtonComponent } from "@styles/components/stylesButtonComponent";

type StylesButtonComponent = "button" | "textButton";
interface ButtonComponentProps {
  label?: string;
  customStyles?: Record<StylesButtonComponent, any>;
  replaceStyles?: Record<StylesButtonComponent, any>;
  Children?: React.FC<any>;
  children?: React.ReactNode;
  touchableOpacity?: boolean;
  touchableOpacityIntensity?: number;
  forceReplaceStyles?: boolean;
  handlerHoverIn?: (event: NativeSyntheticEvent<NativeMouseEvent>) => void;
  handlerFocus?: (event: NativeSyntheticEvent<TargetedEvent>) => void;
  handlerHoverOut?: (event: NativeSyntheticEvent<NativeMouseEvent>) => void;
  handlePress: () => any;
  disabled?: boolean;
}

/**
 * Compares two ButtonComponentProps objects for equality.
 * Used to prevent unnecessary re-renders of the ButtonComponent.
 *
 * @param {ButtonComponentProps} prev - The previous props.
 * @param {ButtonComponentProps} next - The next props.
 * @returns {boolean} True if the props are equal, false otherwise.
 */
const areEqual = (
  prev: ButtonComponentProps,
  next: ButtonComponentProps
): boolean => {
  return (
    prev.disabled === next.disabled &&
    prev.label === next.label &&
    prev.forceReplaceStyles === next.forceReplaceStyles &&
    prev.touchableOpacity === next.touchableOpacity &&
    prev.touchableOpacityIntensity === next.touchableOpacityIntensity &&
    prev.handlerFocus === next.handlerFocus &&
    prev.handlerHoverIn === next.handlerHoverIn &&
    prev.handlerHoverOut === next.handlerHoverOut &&
    prev.handlePress === next.handlePress &&
    prev.Children === next.Children &&
    prev.children === next.children &&
    shallowEqual(prev.replaceStyles, next.replaceStyles) &&
    shallowEqual(prev.customStyles, next.customStyles)
  );
};

/**
 * Performs a shallow comparison of two objects.
 * Returns true if they have the same keys and values, false otherwise.
 *
 * @param {Record<string, any>} obj1 - The first object to compare.
 * @param {Record<string, any>} obj2 - The second object to compare.
 * @returns {boolean} True if the objects are shallowly equal, false otherwise.
 */
const shallowEqual = (
  obj1?: Record<string, any>,
  obj2?: Record<string, any>
): boolean => {
  if (obj1 === obj2) return true;
  if (!obj1 || !obj2) return false;

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  if (keys1.length !== keys2.length) return false;

  for (let key of keys1) {
    if (obj1[key] !== obj2[key]) return false;
  }
  return true;
};

/**
 * ButtonComponent is a customizable button component that supports various styles and behaviors.
 *
 * @param {object} props - The properties for the ButtonComponent.
 * @param {React.ComponentType | undefined} props.Children - Optional custom child component to render inside the button. Must be a function that returns a React element.
 * @param {React.ReactNode | undefined} props.children - Optional custom child component to render inside the button. Can be any valid React node.
 * @param {() => void | undefined} props.handlerFocus - Optional callback fired when the button receives focus.
 * @param {object | undefined} props.replaceStyles - Optional styles to replace the default button and text styles, if one of the styles is empty, the style won't be replaced.
 * @param {boolean | undefined} props.touchableOpacity - If true, enables opacity feedback on press.
 * @param {boolean} [props.forceReplaceStyles=false] - If true, forces the use of replaceStyles even if not provided or the new styles are empty.
 * @param {number} [props.touchableOpacityIntensity=0.7] - The opacity value to apply when the button is pressed.
 * @param {boolean} [props.disabled=false] - If true, disables the button.
 * @param {() => void | undefined} props.handlerHoverOut - Optional callback fired when the pointer leaves the button.
 * @param {() => void | undefined} props.handlerHoverIn - Optional callback fired when the pointer enters the button.
 * @param {object | undefined} props.customStyles - Optional additional styles to apply to the button and text.
 * @param {() => void | undefined} props.handlePress - Optional callback fired when the button is pressed.
 * @param {string | undefined} props.label - Optional text label to display inside the button.
 *
 * @returns {JSX.Element} The rendered button component.
 */
const ButtonComponent: React.FC<ButtonComponentProps> = ({
  Children,
  children,
  handlerFocus,
  replaceStyles,
  touchableOpacity,
  forceReplaceStyles = false,
  touchableOpacityIntensity = 0.7,
  disabled = false,
  handlerHoverOut,
  handlerHoverIn,
  customStyles,
  handlePress,
  label,
}) => {
  const styles = useStylesButtonComponent();

  return (
    <Pressable
      style={({ pressed }) => {
        const opacity = {
          opacity:
            !disabled && touchableOpacity && pressed
              ? touchableOpacityIntensity
              : 1,
        };

        if (replaceStyles?.button || forceReplaceStyles)
          return [replaceStyles?.button, opacity];
        return [styles.button, customStyles?.button, opacity];
      }}
      onFocus={handlerFocus}
      onPress={handlePress}
      disabled={disabled}
      onHoverIn={handlerHoverIn}
      onHoverOut={handlerHoverOut}
    >
      {!!label && (
        <Text
          style={
            replaceStyles?.textButton || forceReplaceStyles
              ? replaceStyles?.textButton
              : [styles.textButton, customStyles?.textButton]
          }
        >
          {label}
        </Text>
      )}
      {!!Children && <Children />}
      {!!children && children}
    </Pressable>
  );
};

const Button = React.memo(ButtonComponent, areEqual);

export default Button;
