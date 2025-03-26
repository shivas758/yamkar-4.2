import '@/app/globals.css';
import { useEffect, useState } from 'react';

// This wrapper helps with SSR for components that use window
function SafeHydrate({ children }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return <div suppressHydrationWarning>{children}</div>;
}

export default function MyApp({ Component, pageProps }) {
  return (
    <SafeHydrate>
      <Component {...pageProps} />
    </SafeHydrate>
  );
} 