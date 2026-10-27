// Logo theo "Mô hình thương hiệu độc lập" (Brand Guideline trang 20): trang hướng tới nông dân không kèm câu bảo trợ.
export function Logo({ variant = "color", className = "h-6" }: { variant?: "color" | "white"; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={variant === "white" ? "/brand/logo-white.svg" : "/brand/logo.svg"}
      alt="Vinaseed"
      className={className + " w-auto"}
    />
  );
}
