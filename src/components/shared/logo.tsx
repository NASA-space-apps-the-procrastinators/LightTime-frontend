import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * The Light Time wordmark: one source for the crew console and mission control.
 * Navy on light pages, white under a `.dark` ancestor; the hidden one is display:none, so it is never read twice.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center", className)}>
      <Image
        src="/images/logo-light.png"
        alt="Light Time"
        width={960}
        height={274}
        priority
        className="h-11 w-auto dark:hidden"
      />
      <Image
        src="/images/logo-dark.png"
        alt="Light Time"
        width={960}
        height={274}
        priority
        className="hidden h-11 w-auto dark:block"
      />
    </span>
  );
}
