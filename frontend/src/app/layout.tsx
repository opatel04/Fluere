import type { Metadata } from "next";
import { Manrope, Architects_Daughter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

const manrope = Manrope({
  subsets: ["latin"],
  variable: '--font-sans',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700', '800'],
});

const architectsDaughter = Architects_Daughter({
  subsets: ["latin"],
  variable: '--font-notebook',
  display: 'swap',
  weight: ['400'],
});

export const metadata: Metadata = {
  title: "Fluere",
  description: "Fluere - Client and Task Management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${manrope.variable} ${architectsDaughter.variable} font-sans antialiased`}>
        <Providers>
          <ThemeProvider>
            {children}
            <Toaster />
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}

