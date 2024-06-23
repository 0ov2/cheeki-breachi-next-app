import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Cheeki Breachi Tracker",
  description: "Created by a monke",
  icons: "https://vrmasterleague.com/images/logos/teams/43bd65e3-84d2-4773-8466-a1f1d8bdcbda.png"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
