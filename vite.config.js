import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/",
  server: { port: 3000, open: true },
  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/firebase")) return "firebase";
          if (id.includes("node_modules/framer-motion")) return "framer-motion";
          if (id.includes("node_modules/xlsx")) return "xlsx";
          if (
            id.includes("node_modules/react") ||
            id.includes("node_modules/react-dom") ||
            id.includes("node_modules/react-router-dom") ||
            id.includes("node_modules/scheduler")
          ) return "react-vendor";
          if (id.includes("node_modules/lucide-react")) return "lucide";
          if (id.includes("node_modules")) return "vendor";
        },
      },
    },
  },
});
