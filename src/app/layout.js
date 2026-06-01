import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Tigarh - Traditional Board Game of Chhattisgarh",
  description: "Experience Tigarh, the traditional Indian Nine Men's Morris strategic alignment game of Chhattisgarh. Play with slate pebbles and forest twigs, form Tigas (mills), and experience immersive procedural sound effects in this stunning terracotta design.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
