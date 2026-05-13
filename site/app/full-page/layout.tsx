import { MarketplaceProvider } from "@/components/providers/marketplace";

export default function FullPageLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <MarketplaceProvider>{children}</MarketplaceProvider>;
}
