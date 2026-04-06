import { Navbar } from "./Navbar";
import { getMarketingInitialAuthenticated } from "@/lib/marketing/get-initial-authenticated";

/** Server component: passes cookie-derived auth into the client Navbar to avoid Sign in / Dashboard flash. */
export async function MarketingNavbar() {
  const initialAuthenticated = await getMarketingInitialAuthenticated();
  return <Navbar initialAuthenticated={initialAuthenticated} />;
}
