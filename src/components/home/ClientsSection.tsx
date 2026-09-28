import type { Client, Recognition } from "@/lib/content/studio";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { RevealGroup } from "@/components/ui/RevealGroup";

interface ClientsSectionProps {
  clients: Client[];
  recognition: Recognition[];
}

/** 08 Clients / Recognition, light, quiet trust section (§31.14). */
export function ClientsSection({
  clients,
  recognition,
}: ClientsSectionProps) {
  return (
    <section
      data-section="clients"
      className="border-t border-line text-primary"
    >
      <div className="container-editorial py-20 lg:py-28">
        <SectionHeader label="Clients & Recognition" title="Trusted by" />

        <div className="mt-12 grid gap-14 lg:grid-cols-2 lg:gap-24">
          <RevealGroup itemSelector=".client-item">
            <ul className="grid grid-cols-2 gap-x-8 gap-y-5">
              {clients.map((client) => (
                <li
                  key={client.name}
                  className="client-item text-title-sm text-secondary"
                >
                  {client.name}
                </li>
              ))}
            </ul>
          </RevealGroup>

          <RevealGroup itemSelector=".recognition-item" stagger={0.08}>
            <ul className="flex flex-col">
              {recognition.map((entry) => (
                <li
                  key={entry.title}
                  className="recognition-item border-b border-line py-5 first:pt-0 last:border-0"
                >
                  <p className="text-body-sm font-medium text-primary">
                    {entry.title}
                  </p>
                  <p className="mt-1 text-caption text-muted">
                    {entry.organization}, {entry.type} · {entry.year}
                  </p>
                </li>
              ))}
            </ul>
          </RevealGroup>
        </div>
      </div>
    </section>
  );
}
