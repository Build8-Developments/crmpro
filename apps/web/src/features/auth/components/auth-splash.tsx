import { ProductLogo } from "@/components/brand/product-logo";

export function AuthSplash({ message = "Loading workspace..." }: { message?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4">
      <ProductLogo className="text-lg" markClassName="size-10" />
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
