/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/ui/index.html', './src/ui/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#f7f6f4',
        surface: '#ffffff',
        line: '#e5e2dd',
        'line-strong': '#d4d0c9',
        ink: '#1b1a18',
        'ink-soft': '#54514c',
        'ink-faint': '#8b8781',
        accent: '#2f5fd0',
        'accent-soft': '#eef2fd',
        'accent-ink': '#264ba6',
        danger: '#b4402d',
        positive: '#3f7d58',
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      boxShadow: {
        panel: '0 1px 2px rgba(27, 26, 24, 0.05), 0 8px 24px rgba(27, 26, 24, 0.06)',
      },
    },
  },
  plugins: [],
};
