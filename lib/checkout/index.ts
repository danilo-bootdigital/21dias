import "server-only";
import { stubAdapter } from "./stub";
import type { CheckoutAdapter } from "./types";

/** Seleciona o adapter de checkout pelo provedor (CHECKOUT_PROVIDER). */
export function getCheckoutAdapter(): CheckoutAdapter {
  const provider = process.env.CHECKOUT_PROVIDER ?? "stub";
  switch (provider) {
    case "stub":
      return stubAdapter;
    // case "kiwify": return kiwifyAdapter;
    // case "hotmart": return hotmartAdapter;
    // case "stripe": return stripeAdapter;
    default:
      return stubAdapter;
  }
}

export type { CheckoutAdapter, NormalizedCheckoutEvent } from "./types";
