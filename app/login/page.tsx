
import { Suspense } from "react";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-gray-100">
          <p className="text-sm text-gray-500">
            Loading login...
          </p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
