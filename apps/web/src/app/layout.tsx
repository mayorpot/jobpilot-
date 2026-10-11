import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "JobPilot — Your AI Career Agent",
    template: "%s | JobPilot",
  },
  description:
    "JobPilot continuously discovers, verifies and matches job opportunities to your career profile.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}