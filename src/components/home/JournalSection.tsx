import type { Article } from "@/lib/content/journal";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { RevealGroup } from "@/components/ui/RevealGroup";
import { JournalCard } from "@/components/journal/JournalCard";

interface JournalSectionProps {
  articles: Article[];
}

/** 10 Journal, light, editorial (§31.14). Up to 3 latest articles (§6.1). */
export function JournalSection({ articles }: JournalSectionProps) {
  return (
    <section
      data-section="journal"
      className="border-t border-line text-primary"
    >
      <div className="container-editorial py-20 lg:py-28">
        <SectionHeader
          label="Journal"
          title={
            <>
              Notes & <em>stories</em>
            </>
          }
          action={{ label: "Read the journal", href: "/journal" }}
        />
        <RevealGroup
          variant="media"
          className="mt-12"
          itemSelector=".journal-item"
        >
          <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <div key={article.slug} className="journal-item">
                <JournalCard article={article} />
              </div>
            ))}
          </div>
        </RevealGroup>
      </div>
    </section>
  );
}
