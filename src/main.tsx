import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { MediaProvider } from "./contexts/MediaContext.tsx";
import { WatchlistProvider } from "./contexts/WatchlistContext.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MediaProvider>
      <WatchlistProvider>
        <App />
      </WatchlistProvider>
    </MediaProvider>
  </StrictMode>,
);
