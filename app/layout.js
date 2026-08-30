import { Saira } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";

// One family for the whole site. Variable, so the hierarchy can come from
// weight and tracking rather than a second face.
const saira = Saira({
  subsets: ["latin"],
  variable: "--font-saira",
  display: "swap",
});

export const metadata = {
  // Resolves og:image / twitter image URLs. Falls back to the prod origin so it
  // doesn't default to localhost in production (set NEXT_PUBLIC_SITE_URL on the VPS).
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://orvo.local"),
  title: {
    default: "Orvo — Modern Wardrobe Essentials",
    template: "%s | Orvo",
  },
  description:
    "Orvo builds considered, everyday clothing for men, women and kids. Shop new drops, core essentials and seasonal edits across Bangladesh.",
  keywords: ["orvo", "clothing", "essentials", "men", "women", "kids", "Bangladesh", "fashion"],
  openGraph: {
    title: "Orvo — Modern Wardrobe Essentials",
    description: "Considered, everyday clothing. Built to be worn.",
    siteName: "Orvo",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${saira.variable} font-sans antialiased bg-paper text-ink`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
