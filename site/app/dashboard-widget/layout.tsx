import { MarketplaceProvider } from "@/components/providers/marketplace";

export default function DashboardWidgetLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <MarketplaceProvider>{children}</MarketplaceProvider>;
}
