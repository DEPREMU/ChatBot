import { useLanguage } from "@/context/LanguageContext";
import { LanguagesSupported } from "@/utils";
import React from "react";
import { Pressable, View } from "react-native";
import { Text, Switch } from "react-native-paper";

const languages: Record<LanguagesSupported, string> = {
  en: "English",
  es: "Español",
};

const Settings: React.FC = () => {
  const { translations, setLanguage, language } = useLanguage();

  return (
    <View style={{ padding: 16 }}>
      <View
        style={{ flexDirection: "column", alignItems: "center", marginTop: 16 }}
      >
        <Text variant="bodyLarge">{translations.selectLanguage}</Text>
        {Object.entries(languages).map(([langCode, lang]) => (
          <Pressable
            key={lang}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-evenly",
              margin: 14,
              width: "100%",
            }}
            onPress={() => setLanguage(langCode as LanguagesSupported)}
          >
            <Text variant="bodyLarge">{lang}</Text>
            <Switch
              value={language === langCode}
              disabled={language === langCode}
              onValueChange={() => setLanguage(langCode as LanguagesSupported)}
              style={{ marginLeft: 8 }}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
};

export default Settings;
