import React from "react";
import { View } from "react-native";
import { Text } from "react-native-paper";
import useStylesChatbot from "@styles/stylesChatbot";
import {
  ErrorChatbot,
  stringifyData,
  MessageChatbot,
  parseTextChatbot,
} from "@utils";

type MessagesRenderProps = {
  messages: MessageChatbot[];
  styles: ReturnType<typeof useStylesChatbot>;
  error: ErrorChatbot;
};

const MessagesRender: React.FC<MessagesRenderProps> = ({
  messages,
  styles,
  error,
}) => {
  const lenMessages = messages.length - 1;

  return (
    <>
      {messages.map((message, index) => {
        const isUserMessage = message.from === "user";

        return (
          <View
            key={index}
            style={
              styles?.[`messageContainer${isUserMessage ? "User" : "Bot"}`]
            }
          >
            <Text style={styles.messageText}>
              {parseTextChatbot(message?.text || "", isUserMessage)}
            </Text>
            <Text style={styles.dateText}>
              {new Date(message?.timestamp || "").toLocaleString()}
            </Text>
          </View>
        );
      })}
    </>
  );
};

const MessagesRenderer = React.memo(MessagesRender, (prevProps, nextProps) => {
  if (prevProps.messages.length !== nextProps.messages.length) return false;
  if (stringifyData(prevProps.error) !== stringifyData(nextProps.error))
    return false;
  for (const style of Object.keys(prevProps.styles) as Array<
    keyof typeof prevProps.styles
  >) {
    if (
      stringifyData(prevProps.styles[style]) !==
      stringifyData(nextProps.styles[style])
    )
      return false;
  }
  return true;
});

export default MessagesRenderer;
