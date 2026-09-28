import type { Metadata } from "next";
import { MediaPanel } from "@/components/admin/MediaPanel";

export const metadata: Metadata = { title: "Media Library" };

/** Admin → Media → Library (§20). */
export default function AdminMediaPage() {
  return (
    <>
      <h1 className="font-display text-display-sm">Media Library</h1>
      <p className="mt-2 max-w-2xl text-body-sm text-secondary">
        The central media catalog. Edit alt text and credit, track usage
        state, and delete only when nothing references the asset.
      </p>
      <div className="mt-8">
        <MediaPanel />
      </div>
    </>
  );
}
