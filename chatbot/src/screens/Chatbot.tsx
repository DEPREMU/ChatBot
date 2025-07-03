import {
  View,
  Image,
  ScrollView,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from "react-native";
import {
  log,
  logError,
  RESET_ICON,
  ErrorChatbot,
  stringifyData,
  MessageChatbot,
  getFormattedDate,
  parseTextChatbot,
  TimesOutIdChatbot,
  LastMessageChatbot,
} from "@utils";
import Button from "@components/Button";
import ButtonComponent from "@components/Button";
import { useLanguage } from "@/context/LanguageContext";
import useStylesChatbot from "@styles/stylesChatbot";
import MessagesRenderer from "@components/RenderMessages";
import { TextInput, Text } from "react-native-paper";
import React, { useCallback, useEffect, useRef, useState } from "react";

const voidMessage: LastMessageChatbot = {
  message: "",
  chunk: [],
  writing: false,
  isThinking: false,
};

const initLastMsgBot: LastMessageChatbot = {
  message: "",
  chunk: [],
  writing: false,
  isThinking: false,
};

const initialTimesOutId: TimesOutIdChatbot = {
  thinkingText: { id: null, type: "interval" },
  botThinking: { id: null, type: "timeout" },
};

const initError: ErrorChatbot = {
  code: undefined,
  message: "",
  isError: false,
  messageFrom: null,
};

type ResponseSocket =
  | {
      type: "info";
    }
  | {
      type: "history";
      history?: MessageChatbot[];
    }
  | {
      type: "error";
      message: string;
    }
  | {
      type: "response-stream";
      text: string;
      isDone?: boolean;
      isThinking?: boolean;
      title?: string;
    };

const timeAvailableForBotThinking = 180000; // 3 minute

interface ChatBotProps {
  chatId: string;
  userId: string;
  isDevMode: boolean;
  setTitleChat: React.Dispatch<React.SetStateAction<string>>;
}

const ChatBot: React.FC<ChatBotProps> = ({
  chatId,
  userId,
  isDevMode,
  setTitleChat,
}) => {
  const styles = useStylesChatbot();
  const { translations } = useLanguage();
  const timesOutId = useRef<TimesOutIdChatbot>(initialTimesOutId);
  const [error, setError] = useState<ErrorChatbot>(initError);
  const [prompt, setPrompt] = useState<string>("");
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [messages, setMessages] = useState<MessageChatbot[]>([]);
  const [lastMsgUser, setLastMsgUser] = useState<MessageChatbot | null>(null);
  const [thinkingText, setThinkingText] = useState<string | null>(null);
  const [refScrollView, setRefScrollView] = useState<ScrollView | null>(null);
  const [lastMsgBot, setLastMsgBot] = useState<LastMessageChatbot>(voidMessage);

  const clearTimeOutWithId = (intervalIdKey: keyof TimesOutIdChatbot) => {
    if (!timesOutId?.current?.[intervalIdKey].id) return;
    clearInterval(timesOutId?.current?.[intervalIdKey].id);
    timesOutId.current[intervalIdKey].id = null;
  };

  const scrollToBottomScrollView = useCallback(
    () => refScrollView?.scrollToEnd({ animated: true }),
    [refScrollView]
  );

  const startThinkingText = useCallback(() => {
    if (timesOutId.current?.thinkingText?.id) return;
    setThinkingText(".");
    timesOutId.current.thinkingText.id = setInterval(() => {
      setThinkingText((p) => (p && p.length > 2 ? "." : [p, "."].join("")));
    }, 500);
  }, []);

  const sendMessageToBot = useCallback(
    (prompt: string) => {
      socket?.send(stringifyData({ type: "message", prompt, userId, chatId }));
      setPrompt("");
    },
    [socket, userId, prompt]
  );

  const sendMessage = useCallback(() => {
    log("Sending message to bot:", prompt);
    if (
      !socket ||
      (socket.readyState !== WebSocket.OPEN &&
        socket.readyState !== WebSocket.CONNECTING)
    ) {
      logError("WebSocket is not open.");
      initSocket(true);
      return;
    }
    isDevMode && log(`Sending message: ${prompt}`);
    setMessages((prev) => {
      const newMessage = {
        from: "user",
        text: prompt,
        timestamp: new Date().toISOString(),
        number: prev.length + 1,
      } as MessageChatbot;
      setLastMsgUser(newMessage);
      return [...prev, newMessage];
    });

    sendMessageToBot(prompt);
  }, [sendMessageToBot, socket, prompt, userId, chatId, isDevMode]);

  const handleKeyPress = useCallback(
    (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
      if (e.nativeEvent.key !== "Enter") return;
      if (!prompt || lastMsgBot.writing) return;

      sendMessage();
    },
    [sendMessage]
  );

  const handleChangeTextInput = useCallback(
    (text: string) => {
      setPrompt(text);
      scrollToBottomScrollView();
    },
    [scrollToBottomScrollView]
  );

  const handleRefScrollView = useCallback(
    (ref: ScrollView | null) => {
      if (!ref) return;
      setRefScrollView(ref);
    },
    [setRefScrollView]
  );

  const handleErrorFrom = useCallback(
    (messageFrom: typeof error.messageFrom) => {
      if (!messageFrom || !lastMsgUser) return;
      if (messageFrom === "Bot") {
        sendMessageToBot(lastMsgUser.text);
        setError(initError);
        setLastMsgBot(initLastMsgBot);
      } else if (messageFrom === "User") {
      }
    },
    [socket, error]
  );

  const initSocket = useCallback(
    (forceNewSocket: boolean = false) =>
      setSocket((p) => {
        if (p && p.readyState === WebSocket.OPEN && !forceNewSocket) {
          isDevMode && log("WebSocket already open, reusing existing socket.");
          return p;
        }
        if (p && forceNewSocket) {
          isDevMode &&
            log("Closing existing WebSocket and creating a new one.");
          p.close();
        }

        const socket = new WebSocket("ws://localhost:8080");

        socket.onopen = () => {
          socket.send(
            stringifyData({ type: "init", userId, language: "es", chatId })
          );
        };

        socket.onmessage = (event: MessageEvent<string>) => {
          const data = JSON.parse(event.data) as ResponseSocket;
          switch (data.type) {
            case "info":
              socket.send(stringifyData({ type: "history", userId, chatId }));
              break;
            case "history":
              log(data.history);
              setMessages(data.history || []);
              break;
            case "error":
              isDevMode && logError(`Error for user ${userId}:`, data.message); //! Handle error
              break;
            case "response-stream":
              if (data?.isDone) {
                if (data.text.length > 20)
                  setMessages((prev) => [
                    ...prev,
                    {
                      from: "bot",
                      text: data?.text || "",
                      timestamp: new Date().toISOString(),
                      number: prev.length + 1,
                    },
                  ]);
                else if (lastMsgUser?.text && lastMsgUser.text.length > 0)
                  sendMessageToBot(lastMsgUser.text);
                isDevMode && log(`Final message from bot: ${data.text}`); //! Delete
                log(data);
                setLastMsgBot(initLastMsgBot);
                initSocket();
                setError(initError);
                if (data?.title && messages.length <= 2)
                  setTitleChat(data.title);
              } else if (data?.isThinking) {
                isDevMode && log("Bot is thinking...");
                setLastMsgBot({
                  chunk: [],
                  message: "",
                  writing: true,
                  isThinking: true,
                });
                startThinkingText();
              } else {
                clearTimeOutWithId("botThinking");
                clearTimeOutWithId("thinkingText");
                setLastMsgBot((prev) => ({
                  ...prev,
                  chunk: [...prev.chunk, data.text || ""],
                  writing: !data?.isDone,
                  isThinking: false,
                }));
              }
              break;
            default:
              break;
          }
        };

        socket.onclose = (e) => {
          isDevMode && logError(`WebSocket closed: ${e.code} - ${e.reason}`); //! Handle close
          clearTimeOutWithId("thinkingText");
          clearTimeOutWithId("botThinking");
        };

        return socket;
      }),
    [userId, socket]
  );

  useEffect(() => {
    if (!userId) return;

    initSocket();
  }, [userId]);

  useEffect(() => {}, [lastMsgBot, thinkingText]);

  return (
    <View style={styles.containerApp}>
      <View style={styles.container}>
        {isDevMode && <Text style={styles.subtitle}>User ID: {userId}</Text>}

        <ScrollView
          style={styles.chatContainer}
          contentContainerStyle={styles.chatContentContainer}
          ref={handleRefScrollView}
          onContentSizeChange={scrollToBottomScrollView}
          showsVerticalScrollIndicator={false}
        >
          <MessagesRenderer styles={styles} messages={messages} error={error} />

          {(lastMsgBot.writing || lastMsgBot?.isThinking) && (
            <View style={styles.messageContainerBot}>
              <Text style={styles.messageText}>
                {parseTextChatbot(lastMsgBot.message)}
                {lastMsgBot?.isThinking && thinkingText}
                {lastMsgBot.chunk.length > 0 &&
                  lastMsgBot.chunk.map((_, index) => {
                    if (index === lastMsgBot.chunk.length - 1) {
                      setLastMsgBot((prev) => ({
                        ...prev,
                        message: prev.message + lastMsgBot.chunk.join(""),
                        chunk: [],
                      }));
                      scrollToBottomScrollView();
                    }
                    return lastMsgBot.chunk[index];
                  })}
              </Text>
              <Text style={styles.dateText}>
                {getFormattedDate(new Date())}
              </Text>
            </View>
          )}
          {error.isError && error.messageFrom && (
            <View style={styles?.[`messageContainer${error.messageFrom}`]}>
              <View style={styles.error}>
                <Text style={styles.errorText}>{error.message}</Text>
                <Button
                  replaceStyles={{
                    button: styles.buttonError,
                    textButton: {},
                  }}
                  handlePress={() => handleErrorFrom(error.messageFrom)}
                  children={
                    <Image source={RESET_ICON} style={styles.resetImage} />
                  }
                />
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            label={translations.messageBotPlaceHolder}
            mode="outlined"
            value={prompt}
            disabled={lastMsgBot.writing}
            onChangeText={handleChangeTextInput}
            onKeyPress={handleKeyPress}
            style={styles.input}
          />
          <ButtonComponent
            handlePress={sendMessage}
            disabled={!prompt || lastMsgBot.writing}
            replaceStyles={{ button: styles.buttonSend, textButton: {} }}
            forceReplaceStyles
            children={
              <TextInput.Icon icon="send" size={24} onPress={sendMessage} />
            }
          />
        </View>
      </View>
    </View>
  );
};

export default ChatBot;
