// T044 structural guard: elevated-plumes.css imported ONLY in Full Page route (ADR-0027)
import "../../styles/elevated-plumes.css";
import { MarketplaceProvider } from "@/components/providers/marketplace";

export default function FullPageLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <MarketplaceProvider>{children}</MarketplaceProvider>;
}
