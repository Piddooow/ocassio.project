import { NextResponse } from "next/server";
import { getPublishedProjectBySlug } from "@/lib/content/queries";

/**
 * Public project lookup by slug.
 * GET /api/projects/[slug]
 *
 * Reads the current content layer (media manifest + project seeds) until
 * the portfolio schema task moves projects into SQLite; the API shape
 * stays the same when the backing store swaps.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const project = await getPublishedProjectBySlug(slug);

  if (!project) {
    return NextResponse.json(
      { error: `Project not found: ${slug}.` },
      { status: 404 },
    );
  }

  return NextResponse.json({
    data: {
      slug: project.slug,
      title: project.title,
      category: project.category,
      year: project.year,
      date: project.date,
      mediaCount: {
        photographs: project.photos.length,
        films: project.videos.length,
      },
      href: `/work/${project.slug}`,
    },
  });
}
