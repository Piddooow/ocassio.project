import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSessionUser } from "@/lib/auth/server-session";
import { BrandLogo } from "@/components/site/BrandLogo";
import { SignInForm } from "@/components/admin/SignInForm";

export const metadata: Metadata = { title: "Sign in" };

/**
 * Admin sign-in (§27). Signed-in visitors skip straight to the CMS.
 */
export default async function AdminSignInPage() {
  const user = await getServerSessionUser();
  if (user) redirect("/admin");

  return (
    <div className="flex min-h-dvh items-center justify-center px-5 py-16">
      <div className="w-full max-w-sm">
        <BrandLogo
          variant="mark"
          className="block"
          imgClassName="h-8 w-8 object-contain"
        />
        <p className="mt-6 text-label uppercase tracking-label-wide text-muted">
          Ocassio.Project
        </p>
        <h1 className="mt-2 font-display text-display-md">Admin sign in</h1>
        <p className="mt-3 text-body-sm text-secondary">
          Use the account an owner created for you. Sessions last seven
          days.
        </p>
        <SignInForm />
      </div>
    </div>
  );
}
