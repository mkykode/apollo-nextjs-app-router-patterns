import type { Metadata, Viewport } from "next";
import { Source_Code_Pro, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { ApolloWrapper } from "@/lib/apollo/apollo-wrapper";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-sans",
});

const sourceCode = Source_Code_Pro({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  // Absolute base for og:image and friends. Icons, the manifest, and the Open Graph image
  // are file conventions next to this layout (favicon.ico, apple-icon.png, manifest.ts,
  // opengraph-image.tsx), so nothing else needs listing here.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Catstronauts",
    template: "%s | Catstronauts",
  },
  description: "Apollo Client 4 data-fetching patterns on the Next.js App Router",
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sourceSans.variable} ${sourceCode.variable}`}>
      <body>
        <Header />
        <ApolloWrapper>{children}</ApolloWrapper>
        <Footer />
      </body>
    </html>
  );
}
