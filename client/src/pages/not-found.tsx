import { AlertCircle } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-black">
      <div className="text-center px-4">
        <AlertCircle className="h-10 w-10 text-neutral-500 mx-auto mb-4" />
        <h1 className="text-3xl font-light text-white mb-2">404</h1>
        <p className="text-neutral-500 text-sm mb-6">
          This page doesn't exist.
        </p>
        <Link href="/" className="text-sm text-white underline underline-offset-4 hover:text-neutral-300" data-testid="link-home">
          Go home
        </Link>
      </div>
    </div>
  );
}
