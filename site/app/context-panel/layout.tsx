import { MarketplaceProvider } from "@/components/providers/marketplace";

export default function ContextPanelLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <MarketplaceProvider>{children}</MarketplaceProvider>;
}
