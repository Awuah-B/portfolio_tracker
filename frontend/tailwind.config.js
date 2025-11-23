/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          850: '#151f2e',
          900: '#0f172a',
          950: '#020617',
        },
        emerald: {
          450: '#10b981', // Custom bright emerald
        },
        primary: {
          DEFAULT: '#0F62FE',
          50: '#e6f0ff',
          100: '#cce0ff',
          200: '#99c2ff',
          300: '#66a3ff',
          400: '#3385ff',
          500: '#0F62FE',
          600: '#0b4ec4',
          700: '#083a92',
          800: '#052660',
          900: '#021330',
        },
        secondary: {
          DEFAULT: '#FF6F61',
          50: '#ffe9e6',
          100: '#ffd3cc',
          200: '#ffa799',
          300: '#ff7c66',
          400: '#ff5633',
          500: '#FF6F61',
          600: '#cc594e',
          700: '#99413a',
          800: '#662927',
          900: '#331514',
        },
        success: {
          DEFAULT: '#28A745',
          50: '#e6f4ea',
          100: '#cce9d5',
          200: '#99d3ab',
          300: '#66be80',
          400: '#33a856',
          500: '#28A745',
          600: '#21873a',
          700: '#19652e',
          800: '#124423',
          900: '#0b2617',
        },
        danger: {
          DEFAULT: '#DC3545',
          50: '#f9e6e9',
          100: '#f3cdd3',
          200: '#e79aa7',
          300: '#db677c',
          400: '#cf3450',
          500: '#DC3545',
          600: '#b02c38',
          700: '#84242b',
          800: '#581a1e',
          900: '#2c0d0f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glow-green': '0 0 20px rgba(16, 185, 129, 0.3)',
        'glow-red': '0 0 20px rgba(244, 63, 94, 0.3)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'glass-gradient': 'linear-gradient(145deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.6) 100%)',
      },
    },
  },
  plugins: [],
};
