import AppProviders from "./src/context/AppProviders";
import AppNavigator from "./src/navigation/AppNavigator";

const App = () => {
  return (
    <AppProviders>
      <AppNavigator />
    </AppProviders>
  );
};

export default App;
