import type { ReactNode } from "react";
import ErrorBoundary from "@/components/shared/ErrorBoundary";
import OfflineBanner from "@/components/shared/OfflineBanner";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ToasterProvider } from "@/components/ui/Toaster";
import { Footer } from "@/components/shared/Footer";

interface RootLayoutProps {
  children: ReactNode;
}

export function RootLayout({ children }: RootLayoutProps) {
  return (
    <ErrorBoundary>
      <OfflineBanner />
      <ThemeProvider>
        <ToasterProvider>
          <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
            <div className="flex flex-1 flex-col">
              {children}
            </div>
            <Footer />
          </div>
        </ToasterProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
