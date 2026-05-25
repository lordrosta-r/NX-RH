import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { compression } from "vite-plugin-compression2";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  plugins: [
    react(),
    compression({
      algorithms: ["gzip"],
      exclude: [/\.(br)$/, /\.(gz)$/],
      threshold: 1024,
    }),
    compression({
      algorithms: ["brotliCompress"],
      exclude: [/\.(br)$/, /\.(gz)$/],
      threshold: 1024,
    }),
    process.env.ANALYZE &&
      visualizer({
        filename: "dist/stats.html",
        open: false,
        gzipSize: true,
        brotliSize: true,
      }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    cssMinify: true,
    minify: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes("node_modules")) {
            if (
              id.includes("react-dom") ||
              id.includes("react/") ||
              id.includes("react-router")
            ) {
              return "vendor-react";
            }
            if (id.includes("@tanstack/react-query")) return "vendor-query";
            if (id.includes("jspdf") || id.includes("jspdf-autotable"))
              return "vendor-pdf";
            if (id.includes("recharts")) return "vendor-charts";
            if (id.includes("@xyflow") || id.includes("xyflow"))
              return "vendor-flow";
            if (id.includes("@dnd-kit")) return "vendor-dnd";
            if (id.includes("lucide-react")) return "vendor-icons";
          }
          if (
            id.includes("/src/pages/Evaluation") ||
            id.includes("/src/hooks/useEvaluationForm")
          ) {
            return "feature-evaluations";
          }
          if (
            id.includes("/src/pages/Campaign") ||
            id.includes("/src/hooks/useCampaignForm") ||
            id.includes("/src/hooks/useCampaignDetail")
          ) {
            return "feature-campaigns";
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
