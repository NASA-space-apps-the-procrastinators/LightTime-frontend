import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export function NotFoundMessage({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-start gap-3 px-4 py-10 md:px-8">
      <h1 className="font-heading text-xl font-semibold">{title}</h1>
      <Link
        href="/base-station"
        className="inline-flex items-center gap-1.5 text-sm text-link"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Back to crew overview
      </Link>
    </div>
  );
}
