import { getOrCreateCart as getOrCreateCartFromService } from "./cartService";

export async function getOrCreateCart() {
  return getOrCreateCartFromService();
}
