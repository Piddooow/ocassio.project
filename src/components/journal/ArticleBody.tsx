import Link from "next/link";
import type { ArticleBlock } from "@/lib/content/journal";
import type { Project } from "@/lib/content/types";
import { InlineText } from "@/components/content/InlineText";
import { MediaPlaceholder } from "@/components/ui/MediaPlaceholder";
import { Showreel } from "@/components/ui/Showreel";
import { Reveal } from "@/components/motion/Reveal";
import { RevealGroup } from "@/components/ui/RevealGroup";

interface ArticleBodyProps {
  blocks: ArticleBlock[];
  /** Resolved project targets for project_reference blocks. */
  referenceProjects: Map<string, Project>;
}

/**
 * Article body (§6.10 allowed blocks): paragraph, heading, image,
 * gallery, quote, video, project reference. Reading width stays
 * constrained; media may be wider than the text measure.
 */
export function ArticleBody({ blocks, referenceProjects }: ArticleBodyProps) {
  return (
    <div className="flex flex-col gap-8 lg:gap-10">
      {blocks.map((block, index) => {
        const key = `${block.type}-${index}`;
        switch (block.type) {
          case "paragraph":
            return (
              <Reveal key={key}>
                <p className="mx-auto max-w-2xl text-body text-secondary">
                  <InlineText value={block.text ?? ""} />
                </p>
              </Reveal>
            );
          case "heading":
            return (
              <Reveal key={key}>
                <h2 className="mx-auto max-w-2xl font-display text-display-md">
                  {block.text}
                </h2>
              </Reveal>
            );
          case "quote":
            return (
              <Reveal key={key}>
                <blockquote className="mx-auto max-w-3xl py-4 text-center">
                  <p className="font-display text-display-md">
                    &ldquo;<InlineText value={block.text ?? ""} rest={false} />&rdquo;
                  </p>
                </blockquote>
              </Reveal>
            );
          case "image":
            return (
              <Reveal key={key}>
                <div className="mx-auto max-w-3xl">
                  {block.media ? (
                    <MediaPlaceholder
                      aspect={block.media.aspect}
                      label={block.media.label}
                    />
                  ) : null}
                </div>
              </Reveal>
            );
          case "image_gallery":
            return (
              <RevealGroup
                key={key}
                itemSelector=".article-gallery-frame"
                className="grid grid-cols-1 gap-4 sm:grid-cols-3"
              >
                {(block.items ?? []).map((item, itemIndex) => (
                  <div
                    key={`${item.label}-${itemIndex}`}
                    className="article-gallery-frame"
                  >
                    <MediaPlaceholder aspect={item.aspect} label={item.label} />
                  </div>
                ))}
              </RevealGroup>
            );
          case "video":
            return (
              <Reveal key={key}>
                <div className="mx-auto max-w-4xl">
                  <Showreel
                    src={null}
                    poster={
                      block.media ?? {
                        aspect: "cinematic",
                        label: "Video, 16:9",
                      }
                    }
                    title="Watch the film"
                  />
                </div>
              </Reveal>
            );
          case "project_reference": {
            const project = block.referenceSlug
              ? referenceProjects.get(block.referenceSlug)
              : undefined;
            if (!project) return null;
            return (
              <Reveal key={key}>
                <Link
                  href={`/work/${project.slug}`}
                  className="group mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-6 border-y border-line py-6"
                >
                  <div>
                    <p className="text-label uppercase tracking-label-wide text-muted">
                      Project Reference
                    </p>
                    <p className="mt-2 font-display text-display-sm transition-transform duration-500 ease-out group-hover:translate-x-1">
                      {project.title}
                    </p>
                  </div>
                  <span className="text-button font-medium text-primary">
                    View project →
                  </span>
                </Link>
              </Reveal>
            );
          }
          default:
            return null;
        }
      })}
    </div>
  );
}
