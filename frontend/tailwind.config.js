/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Poppins', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: "#023E7D",  // Deep Blue
          hover: "#0453A0",    // Slightly lighter deep blue
          light: "#3B82F6",    // Secondary Light Blue
        },
        text: {
          DEFAULT: "#374151",  // Dark Gray
          muted: "#6B7280",    // Medium Gray
        },
        border: "#F3F4F6",     // Light Gray
        background: {
          DEFAULT: "#FFFFFF",  // White
          light: "#F9FAFB",    // Very Light Gray
        },
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "float": "float 3s ease-in-out infinite",
        "bubble-float": "bubbleFloat 15s linear infinite",
        "bounce-short": "bounceShort 1s ease-in-out",
        "page-flip": "pageFlip 1s ease-in-out forwards",
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        bubbleFloat: {
          '0%': { transform: 'translateY(100vh) scale(0.5)', opacity: '0' },
          '50%': { opacity: '0.5' },
          '100%': { transform: 'translateY(-100px) scale(1)', opacity: '0' },
        },
        bounceShort: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-15px)' },
        },
        pageFlip: {
          '0%': { transform: 'rotateY(0deg)', opacity: '1' },
          '50%': { transform: 'rotateY(90deg)', opacity: '0' },
          '51%': { opacity: '0' },
          '100%': { transform: 'rotateY(0deg)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
