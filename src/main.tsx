import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { installAuthFetchInterceptor } from "./lib/auth-fetch-interceptor";
import {
  installStaleBundleRecovery,
  syncAppBuildAndRecoverStaleBundle,
} from "./lib/client-cache-reset";

installAuthFetchInterceptor();
installStaleBundleRecovery();
syncAppBuildAndRecoverStaleBundle();

createRoot(document.getElementById("root")!).render(<App />);
