import React, { JSX } from "react";
import { View } from "react-native";
import { Text } from "react-native-paper";

export const getBoldText = (part: string, index: number): JSX.Element => {
  part = part.replace(/\*\*/g, "");
  const hasItalic = part.search(/_[^_]+_/g) > -1;
  if (hasItalic) part = part.replace(/_/g, "") || "";

  return (
    <Text
      key={index}
      style={{
        fontWeight: "bold",
        fontStyle: hasItalic ? "italic" : "normal",
      }}
    >
      {part.trim()}
    </Text>
  );
};

export const getSeparator = (index: number): JSX.Element => (
  <View
    key={index}
    style={{ height: 1, backgroundColor: "#ccc", width: "100%" }}
  />
);

export const getListItem = (part: string, index: number): JSX.Element => {
  part = part.replace("*", "\u2022").trim();
  let partInBold;
  const hasBold = part.search(/\*\*[^*]+\*\*/g) > -1;
  if (hasBold) {
    partInBold = part.match(/\*\*[^*]+\*\*/g)?.[0];
    part = part
      .replace(partInBold || "", "")
      .replace("\u2022", "")
      .trim();
    partInBold = partInBold ? partInBold.slice(2, -2) : "";
    partInBold = ["\u2022", partInBold].join(" ");
  }

  return (
    <Text
      style={{
        fontStyle: "italic",
      }}
      key={index}
    >
      {hasBold && <Text style={{ fontWeight: "bold" }}>{partInBold}</Text>}
      {part}
      {"\n"}
    </Text>
  );
};

export const getItalicText = (part: string, index: number): JSX.Element => {
  const italicText = part.slice(1, -1);
  return (
    <Text style={{ fontStyle: "italic" }} key={index}>
      {italicText}
      {"\n"}
    </Text>
  );
};

export const getTitleText = (part: string, index: number): JSX.Element => {
  const headerLevel = part.match(/^#+/) as RegExpMatchArray;

  const level = headerLevel[0].length;
  const headerText = part.slice(level).replace(/\*\*/g, "").trim();
  return (
    <Text
      key={index}
      style={{
        fontSize: 22 - level * 2,
        fontWeight: "bold",
        marginVertical: 5,
      }}
    >
      {headerText}
    </Text>
  );
};

export const parseTextChatbot = (
  input: string,
  isUserMessage: boolean = false
): JSX.Element[] => {
  if (isUserMessage) return [<Text key={0}>{input}</Text>];

  let parts = input
    .split(
      /(\*\*[^*]+\*\*)|(\-\-\-)|(\*[^\n]+)|(\_[^\n]+\_)|(\#[^\n]+)|(\#\#[^\n]+)|(\#\#\#[^\n]+)/g
    )
    .filter(Boolean);

  return parts.map((part, index) => {
    // Bold text
    if (part.startsWith("**") && part.endsWith("**"))
      return getBoldText(part, index);
    // Separator
    if (part === "---") return getSeparator(index);
    // List item
    if (part.startsWith("*")) return getListItem(part, index);
    // Italic text
    if (part.startsWith("_") && part.endsWith("_"))
      return getItalicText(part, index);
    // Title text
    if (part.startsWith("#")) return getTitleText(part, index);
    // If none of the above, return as normal text
    return <Text key={index}>{part}</Text>;
  });
};
