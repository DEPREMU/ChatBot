export type MessageChatbot = {
  from: "user" | "bot";
  text: string;
  timestamp: string;
  number: number;
};

export type LastMessageChatbot = {
  message: string;
  chunk: string[];
  writing: boolean;
  isThinking?: boolean;
};


export type TypeTimeOut = { id: NodeJS.Timeout | null; type: "timeout" | "interval" };

export type TimesOutIdChatbot = {
  thinkingText: TypeTimeOut;
  botThinking: TypeTimeOut;
};

export type ErrorChatbot = {
  isError: boolean;
  messageFrom: "Bot" | "User" | null;
  message: string;
  code?: number;
};