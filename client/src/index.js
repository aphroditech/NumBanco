import React from "react";
import ReactDOM from "react-dom";
import { HashRouter } from "react-router-dom";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { ChakraProvider } from "@chakra-ui/react";
import App from "./App";
import store from "./store/store";
import theme from "theme/themeAdmin.js";
import { HelmetProvider } from "react-helmet-async";
// Suppress emotion kebab-case warnings (these are false positives from Chakra UI internals)
if (process.env.NODE_ENV === 'development') {
  const originalError = console.error;
  console.error = (...args) => {
    const errorStr = args.join(' ');
    if (errorStr.includes('kebab-case') && errorStr.includes('css properties')) {
      // Suppress these specific warnings as they're from Chakra UI internals
      return;
    }
    originalError.apply(console, args);
  };
}

ReactDOM.render(
  <Provider store={store}>
    <ChakraProvider theme={theme} resetCss={false}>
      <BrowserRouter>
        <HelmetProvider>
          <App />
        </HelmetProvider>
      </BrowserRouter>
    </ChakraProvider>
  </Provider>,
  document.getElementById("root")
);