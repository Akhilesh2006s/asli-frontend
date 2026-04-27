import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { installAuthFetchInterceptor } from "./lib/auth-fetch-interceptor";

installAuthFetchInterceptor();

createRoot(document.getElementById("root")!).render(<App />);
