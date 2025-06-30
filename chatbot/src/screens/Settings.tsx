import { useLanguage } from "@/context/LanguageContext";
import { LanguagesSupported } from "@/utils";
import React from "react";
import { View } from "react-native";
import { Text, Switch } from "react-native-paper";

const languages: Record<LanguagesSupported, string> = {
  en: "English",
  es: "Español",
};

const Settings: React.FC = () => {
  const { translations, setLanguage, language } = useLanguage();

  return (
    <View style={{ padding: 16 }}>
      <Text variant="headlineSmall">{translations.settings}</Text>
      <View
        style={{ flexDirection: "row", alignItems: "center", marginTop: 16 }}
      >
        <Text variant="bodyLarge">{translations.selectLanguage}</Text>
        {Object.entries(languages).map(([langCode, lang]) => (
          <View
            key={lang}
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginLeft: 16,
            }}
          >
            <Text variant="bodyLarge">{lang}</Text>
            <Switch
              value={language === langCode}
              onValueChange={() => setLanguage(langCode as LanguagesSupported)}
              style={{ marginLeft: 8 }}
            />
          </View>
        ))}
      </View>
    </View>
  );
};

export default Settings;
