import { getFormattedDate, log } from "@utils";
import { ScrollView, View } from "react-native";
import { Appbar, Text } from "react-native-paper";
import React, { useEffect, useState } from "react";
import useStylesChats from "@/styles/stylesChats";

interface ChatProps {
  userId: string;
  setChatId: React.Dispatch<React.SetStateAction<string>>;
}

type TypeChats = {
  id: string;
  title: string;
  timestamp: string;
}[];

const Chats: React.FC<ChatProps> = ({ userId, setChatId }) => {
  const { styles, isPhone } = useStylesChats();
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

  return (
    <View style={styles.mainContainer}>
      {chats.length > 0 ? (
        <ScrollView style={styles.container}>
          {chats.map((chat) => {
            const date = new Date(chat.timestamp);
            const formattedDate = getFormattedDate(date, "es-MX", {
              dateStyle: isPhone ? "medium" : "full",
              timeStyle: "short",
              timeZone: "America/Mexico_City",
            });

            return (
              <View key={chat.id} style={styles.chatCard}>
                <View style={styles.header}>
                  <Appbar.Action
                    icon="chat"
                    onPress={() => setChatId(chat.id)}
                    accessibilityLabel={`Chat ${chat.title}`}
                  />
                  <Text style={styles.title}>{chat.title}</Text>
                </View>
                <Text style={styles.timestamp}>{formattedDate}</Text>
              </View>
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
