import { LayoutProvider } from "@context/LayoutContext";

const AppProviders = ({ children }: { children: React.ReactNode }) => (
  <LayoutProvider>{children}</LayoutProvider>
);

export default AppProviders;
