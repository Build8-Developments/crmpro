import { ProductLogo } from "@/components/brand/product-logo";

export function AuthSplash({ message = "Loading workspace..." }: { message?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4">
      <ProductLogo className="text-2xl" />
      <p className="mt-4 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
