import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MotionConfig } from "motion/react";
import "./styles/theme.css";
import { App } from "./App";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Shortform City: #root element is missing from index.html");

createRoot(rootEl).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </StrictMode>,
);
