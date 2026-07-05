/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        'dark-blue': {
          'primary': '#3B82F6',
          'secondary': '#10B981',
          'accent': '#8B5CF6',
          'neutral': '#1F2937',
          'base-100': '#111827',
          'info': '#3B82F6',
          'success': '#10B981',
          'warning': '#F59E0B',
          'error': '#EF4444',
        },
        'dark-green': {
          'primary': '#22C55E',
          'secondary': '#10B981',
          'accent': '#8B5CF6',
          'neutral': '#1F2937',
          'base-100': '#111827',
          'info': '#3B82F6',
          'success': '#22C55E',
          'warning': '#F59E0B',
          'error': '#EF4444',
        },
        'dark-red': {
          'primary': '#EF4444',
          'secondary': '#10B981',
          'accent': '#8B5CF6',
          'neutral': '#1F2937',
          'base-100': '#111827',
          'info': '#3B82F6',
          'success': '#22C55E',
          'warning': '#F59E0B',
          'error': '#EF4444',
        },
        'dark-yellow': {
          'primary': '#EAB308',
          'secondary': '#10B981',
          'accent': '#8B5CF6',
          'neutral': '#1F2937',
          'base-100': '#111827',
          'info': '#3B82F6',
          'success': '#22C55E',
          'warning': '#F59E0B',
          'error': '#EF4444',
        },
        'dark-purple': {
          'primary': '#A855F7',
          'secondary': '#10B981',
          'accent': '#8B5CF6',
          'neutral': '#1F2937',
          'base-100': '#111827',
          'info': '#3B82F6',
          'success': '#22C55E',
          'warning': '#F59E0B',
          'error': '#EF4444',
        },
        'dark-pink': {
          'primary': '#EC4899',
          'secondary': '#10B981',
          'accent': '#8B5CF6',
          'neutral': '#1F2937',
          'base-100': '#111827',
          'info': '#3B82F6',
          'success': '#22C55E',
          'warning': '#F59E0B',
          'error': '#EF4444',
        },
      },
    ],
  },
}
