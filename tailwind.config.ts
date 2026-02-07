import type { Config } from "tailwindcss";

export default {
    content: [
        "./components/**/*.{ts,tsx}",
        "./src/**/*.{ts,tsx,html}",
        "./lib/**/*.{ts,tsx}",
    ],
} satisfies Config;
