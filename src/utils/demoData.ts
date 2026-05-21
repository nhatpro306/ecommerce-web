export const useDemoData = process.env.NEXT_PUBLIC_USE_DEMO_DATA === "true";
export const isProductionDemoDataUnsafe =
  process.env.NODE_ENV === "production" && useDemoData;

if (isProductionDemoDataUnsafe) {
  console.warn(
    "NEXT_PUBLIC_USE_DEMO_DATA=true is enabled in production. RESEY production should use real Supabase products only.",
  );
}
