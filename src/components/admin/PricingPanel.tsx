"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/StatusChip";
import {
  FormField,
  SELECT_CLASS,
  TextAreaInput,
  TextInput,
} from "@/components/forms/FormField";
import { PRICE_TYPE_LABEL } from "@/lib/content/pricing";
import { adminRequest, fromLines, toLines } from "@/lib/admin-client";
import { useAdminCollection } from "./useAdminCollection";

interface PricingRow {
  id: number;
  serviceId: number;
  packageName: string;
  priceType: string;
  amount: number | null;
  currency: string | null;
  duration: string | null;
  deliverables: string[];
  notes: string | null;
  sortOrder: number;
  status: string;
}

interface ServiceOption {
  id: number;
  name: string;
}

const PRICE_TYPE_OPTIONS = Object.entries(PRICE_TYPE_LABEL) as [
  keyof typeof PRICE_TYPE_LABEL,
  string,
][];

const EMPTY_CREATE = {
  serviceId: "",
  packageName: "",
  priceType: "custom_quote",
  amount: "",
  currency: "IDR",
  duration: "",
  notes: "",
};

/** Pricing module panel (§15, §6.6): per-service packages and amounts. */
export function PricingPanel() {
  const collection = useAdminCollection<PricingRow>("/api/admin/pricing");
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Record<string, string> | null>(null);
  const [created, setCreated] = useState(EMPTY_CREATE);

  useEffect(() => {
    void (async () => {
      const { ok, body } = await adminRequest<ServiceOption[]>(
        "/api/admin/services",
      );
      if (ok) setServices(body?.data ?? []);
    })();
  }, []);

  const serviceName = (id: number) =>
    services.find((service) => service.id === id)?.name ?? `Service ${id}`;

  const openEditor = (row: PricingRow) => {
    if (editingId === row.id) {
      setEditingId(null);
      setDraft(null);
      return;
    }
    setEditingId(row.id);
    setDraft({
      serviceId: String(row.serviceId),
      packageName: row.packageName,
      priceType: row.priceType,
      amount: row.amount === null ? "" : String(row.amount),
      currency: row.currency ?? "",
      duration: row.duration ?? "",
      deliverables: fromLines(row.deliverables),
      notes: row.notes ?? "",
      sortOrder: String(row.sortOrder),
    });
  };

  const saveEditor = async (row: PricingRow) => {
    if (!draft) return;
    const ok = await collection.update(row.id, {
      serviceId: Number(draft.serviceId),
      packageName: draft.packageName,
      priceType: draft.priceType,
      amount: draft.amount.trim() === "" ? null : Number(draft.amount),
      currency: draft.currency.trim() === "" ? null : draft.currency,
      duration: draft.duration.trim() === "" ? null : draft.duration,
      deliverables: toLines(draft.deliverables),
      notes: draft.notes.trim() === "" ? null : draft.notes,
      sortOrder: Number(draft.sortOrder),
    });
    if (ok) {
      setEditingId(null);
      setDraft(null);
    }
  };

  return (
    <div className="grid gap-12 xl:grid-cols-[1.8fr_1fr]">
      <section>
        <h2 className="text-title-sm text-primary">Pricing entries</h2>
        {!collection.loaded ? (
          <p className="mt-4 text-body-sm text-muted">Loading pricing...</p>
        ) : null}
        {collection.listError ? (
          <p role="alert" className="mt-4 text-caption text-error">
            {collection.listError}
          </p>
        ) : null}
        <ul className="mt-4 flex flex-col">
          {collection.items.map((row) => (
            <li
              key={row.id}
              data-admin-pricing={row.id}
              className="border-b border-line py-5 first:border-t"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-body-sm font-medium text-primary">
                    {row.packageName}
                  </p>
                  <p className="mt-1 text-caption text-muted">
                    {serviceName(row.serviceId)} ·{" "}
                    {PRICE_TYPE_LABEL[row.priceType as keyof typeof PRICE_TYPE_LABEL] ??
                      row.priceType}
                    {row.amount !== null ? ` · ${row.currency ?? "IDR"} ${row.amount}` : ""}
                  </p>
                </div>
                <StatusChip
                  tone={row.status === "published" ? "success" : "neutral"}
                >
                  {row.status}
                </StatusChip>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Button
                  size="compact"
                  variant="secondary"
                  onClick={() => openEditor(row)}
                >
                  {editingId === row.id ? "Editing" : "Edit"}
                </Button>
                <Button
                  size="compact"
                  variant="tertiary"
                  disabled={collection.busyId === row.id}
                  onClick={() => void collection.action(row.id, "publish")}
                >
                  Publish
                </Button>
                <Button
                  size="compact"
                  variant="tertiary"
                  disabled={collection.busyId === row.id}
                  onClick={() => void collection.action(row.id, "unpublish")}
                >
                  Unpublish
                </Button>
                <Button
                  size="compact"
                  variant="tertiary"
                  disabled={collection.busyId === row.id}
                  onClick={() => void collection.action(row.id, "archive")}
                >
                  Archive
                </Button>
                <Button
                  size="compact"
                  variant="tertiary"
                  disabled={collection.busyId === row.id}
                  onClick={() => void collection.remove(row.id)}
                >
                  Delete
                </Button>
              </div>
              {collection.rowError[row.id] ? (
                <p role="alert" className="mt-2 text-caption text-error">
                  {collection.rowError[row.id]}
                </p>
              ) : null}

              {editingId === row.id && draft ? (
                <div className="mt-5 flex flex-col gap-4 border-l-2 border-line pl-5">
                  <div>
                    <label
                      htmlFor={`pr-svc-${row.id}`}
                      className="text-label uppercase tracking-label-wide text-secondary"
                    >
                      Service *
                    </label>
                    <select
                      id={`pr-svc-${row.id}`}
                      value={draft.serviceId}
                      onChange={(event) =>
                        setDraft({ ...draft, serviceId: event.target.value })
                      }
                      className={`mt-2 ${SELECT_CLASS}`}
                    >
                      {services.map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <FormField
                    id={`pr-name-${row.id}`}
                    label="Package name"
                    required
                  >
                    <TextInput
                      id={`pr-name-${row.id}`}
                      name="packageName"
                      value={draft.packageName}
                      onChange={(event) =>
                        setDraft({ ...draft, packageName: event.target.value })
                      }
                    />
                  </FormField>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label
                        htmlFor={`pr-type-${row.id}`}
                        className="text-label uppercase tracking-label-wide text-secondary"
                      >
                        Price type *
                      </label>
                      <select
                        id={`pr-type-${row.id}`}
                        value={draft.priceType}
                        onChange={(event) =>
                          setDraft({ ...draft, priceType: event.target.value })
                        }
                        className={`mt-2 ${SELECT_CLASS}`}
                      >
                        {PRICE_TYPE_OPTIONS.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <FormField
                      id={`pr-amount-${row.id}`}
                      label="Amount"
                      hint="Empty for Custom Quote."
                    >
                      <TextInput
                        id={`pr-amount-${row.id}`}
                        name="amount"
                        value={draft.amount}
                        onChange={(event) =>
                          setDraft({ ...draft, amount: event.target.value })
                        }
                      />
                    </FormField>
                    <FormField id={`pr-currency-${row.id}`} label="Currency">
                      <TextInput
                        id={`pr-currency-${row.id}`}
                        name="currency"
                        value={draft.currency}
                        onChange={(event) =>
                          setDraft({ ...draft, currency: event.target.value })
                        }
                      />
                    </FormField>
                  </div>
                  <FormField id={`pr-duration-${row.id}`} label="Duration">
                    <TextInput
                      id={`pr-duration-${row.id}`}
                      name="duration"
                      value={draft.duration}
                      onChange={(event) =>
                        setDraft({ ...draft, duration: event.target.value })
                      }
                    />
                  </FormField>
                  <FormField
                    id={`pr-deliverables-${row.id}`}
                    label="Deliverables"
                    hint="One deliverable per line."
                  >
                    <TextAreaInput
                      id={`pr-deliverables-${row.id}`}
                      name="deliverables"
                      rows={4}
                      value={draft.deliverables}
                      onChange={(event) =>
                        setDraft({ ...draft, deliverables: event.target.value })
                      }
                    />
                  </FormField>
                  <FormField id={`pr-notes-${row.id}`} label="Notes">
                    <TextAreaInput
                      id={`pr-notes-${row.id}`}
                      name="notes"
                      rows={2}
                      value={draft.notes}
                      onChange={(event) =>
                        setDraft({ ...draft, notes: event.target.value })
                      }
                    />
                  </FormField>
                  <FormField id={`pr-order-${row.id}`} label="Display order">
                    <TextInput
                      id={`pr-order-${row.id}`}
                      name="sortOrder"
                      value={draft.sortOrder}
                      onChange={(event) =>
                        setDraft({ ...draft, sortOrder: event.target.value })
                      }
                    />
                  </FormField>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      size="compact"
                      disabled={collection.busyId === row.id}
                      onClick={() => void saveEditor(row)}
                    >
                      {collection.busyId === row.id ? "Saving..." : "Save entry"}
                    </Button>
                    <Button
                      size="compact"
                      variant="secondary"
                      onClick={() => {
                        setEditingId(null);
                        setDraft(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-line pt-8 xl:border-l xl:border-t-0 xl:pl-12 xl:pt-0">
        <h2 className="text-title-sm text-primary">Add an entry</h2>
        <form
          data-pricing-create
          className="mt-5 flex flex-col gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const ok = await collection.create({
              serviceId: Number(created.serviceId),
              packageName: created.packageName,
              priceType: created.priceType,
              amount: created.amount.trim() === "" ? null : Number(created.amount),
              currency: created.currency.trim() === "" ? null : created.currency,
              duration: created.duration.trim() === "" ? null : created.duration,
              notes: created.notes.trim() === "" ? null : created.notes,
            });
            if (ok) setCreated(EMPTY_CREATE);
          }}
        >
          <div>
            <label
              htmlFor="new-pricing-service"
              className="text-label uppercase tracking-label-wide text-secondary"
            >
              Service *
            </label>
            <select
              id="new-pricing-service"
              value={created.serviceId}
              onChange={(event) =>
                setCreated({ ...created, serviceId: event.target.value })
              }
              className={`mt-2 ${SELECT_CLASS}`}
            >
              <option value="">Choose a service</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </div>
          <FormField id="new-pricing-name" label="Package name" required>
            <TextInput
              id="new-pricing-name"
              name="packageName"
              value={created.packageName}
              onChange={(event) =>
                setCreated({ ...created, packageName: event.target.value })
              }
            />
          </FormField>
          <div>
            <label
              htmlFor="new-pricing-type"
              className="text-label uppercase tracking-label-wide text-secondary"
            >
              Price type *
            </label>
            <select
              id="new-pricing-type"
              value={created.priceType}
              onChange={(event) =>
                setCreated({ ...created, priceType: event.target.value })
              }
              className={`mt-2 ${SELECT_CLASS}`}
            >
              {PRICE_TYPE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <FormField
            id="new-pricing-amount"
            label="Amount"
            hint="Empty for Custom Quote; required for Fixed and Starting From."
          >
            <TextInput
              id="new-pricing-amount"
              name="amount"
              value={created.amount}
              onChange={(event) =>
                setCreated({ ...created, amount: event.target.value })
              }
            />
          </FormField>
          <FormField id="new-pricing-notes" label="Notes">
            <TextAreaInput
              id="new-pricing-notes"
              name="notes"
              rows={2}
              value={created.notes}
              onChange={(event) =>
                setCreated({ ...created, notes: event.target.value })
              }
            />
          </FormField>
          {collection.createError ? (
            <p role="alert" className="text-caption text-error">
              {collection.createError}
            </p>
          ) : null}
          <Button type="submit" disabled={collection.creating}>
            {collection.creating ? "Creating..." : "Create entry"}
          </Button>
        </form>
      </section>
    </div>
  );
}
