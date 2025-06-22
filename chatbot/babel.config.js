module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          alias: {
            "@": "./src",
            "@assets": "./assets",
            "@utils": "./src/utils/index.ts",
            "@components": "./src/components",
            "@screens": "./src/screens",
            "@hooks": "./src/hooks",
            "@navigation": "./src/navigation",
            "@constants": "./src/constants",
            "@context": "./src/context",
            "@styles": "./src/styles",
            "@types": "./src/types/index.ts",
          },
        },
      ],
      "react-native-reanimated/plugin",
    ],
  };
};
