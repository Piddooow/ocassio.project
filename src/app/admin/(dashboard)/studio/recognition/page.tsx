import type { Metadata } from "next";
import { RecognitionPanel } from "@/components/admin/RecognitionPanel";

export const metadata: Metadata = { title: "Recognition" };

/** Admin → Studio → Recognition (§18). */
export default function AdminRecognitionPage() {
  return (
    <>
      <h1 className="font-display text-display-sm">Recognition</h1>
      <p className="mt-2 max-w-2xl text-body-sm text-secondary">
        Publications, awards, features, and exhibitions. Only real entries;
        the public page keeps its labeled placeholder while the list is
        empty.
      </p>
      <div className="mt-8">
        <RecognitionPanel />
      </div>
    </>
  );
}
