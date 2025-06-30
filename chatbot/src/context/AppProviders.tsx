import { LayoutProvider } from "@context/LayoutContext";
import { LanguageProvider } from "./LanguageContext";

const AppProviders = ({ children }: { children: React.ReactNode }) => (
  <LanguageProvider>
    <LayoutProvider>{children}</LayoutProvider>
  </LanguageProvider>
);

export default AppProviders;
