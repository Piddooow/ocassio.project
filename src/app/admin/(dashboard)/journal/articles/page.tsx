import type { Metadata } from "next";
import { ArticlesPanel } from "@/components/admin/ArticlesPanel";

export const metadata: Metadata = { title: "Articles" };

/** Admin → Journal → Articles (§17). */
export default function AdminArticlesPage() {
  return (
    <>
      <h1 className="font-display text-display-sm">Articles</h1>
      <p className="mt-2 max-w-2xl text-body-sm text-secondary">
        Compose journal articles with the documented blocks and run the
        publish workflow. Every save records a version that can be viewed,
        compared, and restored.
      </p>
      <div className="mt-8">
        <ArticlesPanel />
      </div>
    </>
  );
}
