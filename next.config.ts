import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    'localhost',
    'localhost:3000',
    '127.0.0.1',
    '127.0.0.1:3000',
    'gore-kilometer-stylist.ngrok-free.dev',
    'https://gore-kilometer-stylist.ngrok-free.dev',
    '*.ngrok-free.dev',
    '*.ngrok.app',
    '3000-cs-553118797525-default.cs-europe-west4-pear.cloudshell.dev',
    '*.cloudshell.dev',
  ],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
