import { getFormattedDate, log } from "@utils";
import { Pressable, ScrollView, View } from "react-native";
import { Appbar, Text } from "react-native-paper";
import React, { useEffect, useState } from "react";
import useStylesChats from "@/styles/stylesChats";
import { useLanguage } from "@/context/LanguageContext";

interface ChatProps {
  userId: string;
  setChatId: React.Dispatch<React.SetStateAction<string>>;
  setTitleChat: React.Dispatch<React.SetStateAction<string>>;
}

type TypeChats = {
  id: string;
  title: string;
  timestamp: string;
}[];

const Chats: React.FC<ChatProps> = ({ userId, setChatId, setTitleChat }) => {
  const { styles, isPhone } = useStylesChats();
  const { translations } = useLanguage();
  const [chats, setChats] = useState<TypeChats>([]);

  useEffect(() => {
    const fetchChats = async () => {
      const res = await fetch(`http://localhost:8080/chats/${userId}`);
      if (!res.ok) {
        throw new Error("Failed to fetch chats");
      }
      const data = await res.json();
      log(data);
      setChats(data?.chats || []);
    };

    fetchChats();
  }, []);

  const handlePressChat = (chat: TypeChats[number]) => {
    setChatId(chat.id);
    setTitleChat(chat.title);
  };

  return (
    <View style={styles.mainContainer}>
      {chats.length > 0 ? (
        <ScrollView style={styles.container}>
          {chats.map((chat) => {
            const date = new Date(chat.timestamp);
            const formattedDate = getFormattedDate(date, undefined, {
              dateStyle: isPhone ? "long" : "full",
              timeStyle: "short",
            });

            return (
              <Pressable
                key={chat.id}
                style={styles.chatCard}
                onPress={() => handlePressChat(chat)}
              >
                <View style={styles.header}>
                  <Appbar.Action
                    icon="chat"
                    accessibilityLabel={`Chat ${chat.title}`}
                    onPress={() => handlePressChat(chat)}
                  />
                  <Text style={styles.title}>{chat.title}</Text>
                </View>
                <Text style={styles.timestamp}>
                  {translations.chatStarted} {formattedDate}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : (
        <Appbar.Content title="No chats available" />
      )}
    </View>
  );
};

export default Chats;
