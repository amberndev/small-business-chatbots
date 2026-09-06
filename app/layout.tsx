import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "AI Chatbots for Small Businesses · Ambern", template: "%s · Ambern" },
  description: "Three fictional businesses. One configurable assistant engine. Explore Ambern’s interactive chatbot portfolio demonstrations.",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><a className="skip-link" href="#main">Skip to content</a>{children}</body></html>;
}
