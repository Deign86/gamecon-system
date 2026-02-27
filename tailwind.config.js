/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        gc: {
          crimson:  "#C8102E",
          scarlet:  "#E31837",
          blood:    "#7A0019",
          ember:    "#FF2D2D",
          void:     "#080808",
          night:    "#111111",
          slate:    "#1A1A1A",
          iron:     "#222222",
          steel:    "#333333",
          mist:     "#888888",
          cloud:    "#CCCCCC",
          bone:     "#E5E7EB",
          white:    "#FFFFFF",
          success:  "#22C55E",
          warning:  "#EAB308",
          danger:   "#EF4444",
        },
      },
      fontFamily: {
        display: ['"Teko"', "sans-serif"],
        body:    ['"Lexend"', "sans-serif"],
        mono:    ['"JetBrains Mono"', "monospace"],
      },
      animation: {
        "fade-up":     "fadeUp 0.5s ease-out forwards",
        "fade-in":     "fadeIn 0.4s ease-out forwards",
        "slide-up":    "slideUp 0.4s cubic-bezier(0.16,1,0.3,1) forwards",
        "pulse-ring":  "pulseRing 0.6s ease-out",
        "glow":        "glow 2s ease-in-out infinite alternate",
        "count-pop":   "countPop 0.3s cubic-bezier(0.34,1.56,0.64,1)",
        "diagonal":    "diagonalShift 20s linear infinite",
        "grain":       "grain 0.5s steps(1) infinite",
      },
      keyframes: {
        fadeUp: {
          "0%":   { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%":   { opacity: "0", transform: "translateY(100%)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseRing: {
          "0%":   { boxShadow: "0 0 0 0 rgba(200,16,46,0.6)" },
          "100%": { boxShadow: "0 0 0 18px rgba(200,16,46,0)" },
        },
        glow: {
          "0%":   { boxShadow: "0 0 12px rgba(200,16,46,0.15)" },
          "100%": { boxShadow: "0 0 28px rgba(200,16,46,0.35)" },
        },
        countPop: {
          "0%":   { transform: "scale(1)" },
          "50%":  { transform: "scale(1.25)" },
          "100%": { transform: "scale(1)" },
        },
        diagonalShift: {
          "0%":   { backgroundPosition: "0% 0%" },
          "100%": { backgroundPosition: "100% 100%" },
        },
        grain: {
          "0%, 100%": { transform: "translate(0,0)" },
          "10%":      { transform: "translate(-1%,-1%)" },
          "20%":      { transform: "translate(1%,0)" },
          "30%":      { transform: "translate(-2%,1%)" },
          "40%":      { transform: "translate(1%,-1%)" },
          "50%":      { transform: "translate(-1%,2%)" },
          "60%":      { transform: "translate(2%,1%)" },
          "70%":      { transform: "translate(0,-2%)" },
          "80%":      { transform: "translate(-2%,0)" },
          "90%":      { transform: "translate(1%,1%)" },
        },
      },
      backgroundImage: {
        "diagonal-stripe":
          "repeating-linear-gradient(135deg, transparent, transparent 40px, rgba(200,16,46,0.03) 40px, rgba(200,16,46,0.03) 80px)",
      },
    },
  },
  plugins: [],
};
