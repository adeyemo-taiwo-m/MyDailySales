import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MyDailySales — Track Sales & Debts on WhatsApp",
  description: "A WhatsApp-first sales tracker for Nigerian shop owners. Log sales, debts, and check stock by sending simple text messages.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Josefin+Sans:ital,wght@0,100..700;1,100..700&family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
      </head>
      <body>{children}</body>
    </html>
  );
}
