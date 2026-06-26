"use client";

import { useEffect, useState } from "react";
import { COUNTRIES } from "@/lib/constants/countries";
import { createClientSchema } from "@/lib/validators/client";
import { Button, Input } from "@/components/auth/auth-ui";
import { FormSubmitError } from "@/components/ui/form-submit-error";
import { cn } from "@/lib/utils/cn";

export type ClientFormValues = {
  companyName: string;
  contactName: string;
  email: string;
  country: string;
  address: string;
  vatNumber: string;
  notes: string;
};

const EMPTY_FORM: ClientFormValues = {
  companyName: "",
  contactName: "",
  email: "",
  country: "US",
  address: "",
  vatNumber: "",
  notes: "",
};

const FIELD_LABELS: Record<keyof ClientFormValues, string> = {
  companyName: "Company Name",
  contactName: "Contact Name",
  email: "Email",
  country: "Country",
  address: "Address",
  vatNumber: "VAT Number",
  notes: "Notes",
};

type ClientFormDialogProps = {
  open: boolean;
  mode: "create" | "edit";
  initialValues?: Partial<ClientFormValues>;
  onClose: () => void;
  onSuccess: () => void;
  clientId?: string;
};

export function ClientFormDialog({
  open,
  mode,
  initialValues,
  onClose,
  onSuccess,
  clientId,
}: ClientFormDialogProps) {
  const [form, setForm] = useState<ClientFormValues>(EMPTY_FORM);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ClientFormValues, string>>>(
    {}
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ ...EMPTY_FORM, ...initialValues });
      setSubmitError(null);
      setFieldErrors({});
    }
  }, [open, initialValues]);

  if (!open) return null;

  function updateField<K extends keyof ClientFormValues>(
    key: K,
    value: ClientFormValues[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setSubmitError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setFieldErrors({});

    const payload = {
      ...form,
      address: form.address || null,
      vatNumber: form.vatNumber || null,
      notes: form.notes || null,
    };

    const parsed = createClientSchema.safeParse(payload);
    if (!parsed.success) {
      const next: Partial<Record<keyof ClientFormValues, string>> = {};
      const summary: string[] = [];
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof ClientFormValues | undefined;
        if (key && !next[key]) {
          next[key] = issue.message;
          summary.push(`${FIELD_LABELS[key]}: ${issue.message}`);
        }
      }
      setFieldErrors(next);
      setSubmitError(summary.length > 0 ? summary.join(" ") : "Please fix the highlighted fields before submitting.");
      return;
    }

    setLoading(true);

    try {
      const url =
        mode === "create" ? "/api/clients" : `/api/clients/${clientId}`;
      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setSubmitError(json.error ?? "Action failed");
        setLoading(false);
        return;
      }

      onSuccess();
      onClose();
    } catch {
      setSubmitError("Network error. Please try again shortly.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative z-10 my-auto max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">
          {mode === "create" ? "New client" : "Edit client"}
        </h2>

        <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
          <Input
            label="Company Name"
            name="companyName"
            value={form.companyName}
            error={fieldErrors.companyName}
            onChange={(e) => updateField("companyName", e.target.value)}
          />
          <Input
            label="Contact Name"
            name="contactName"
            value={form.contactName}
            error={fieldErrors.contactName}
            onChange={(e) => updateField("contactName", e.target.value)}
          />
          <Input
            label="Email"
            name="email"
            type="email"
            value={form.email}
            error={fieldErrors.email}
            onChange={(e) => updateField("email", e.target.value)}
          />

          <div className="space-y-1.5">
            <label htmlFor="country" className="block text-sm font-medium text-slate-700">
              Country
            </label>
            <select
              id="country"
              name="country"
              value={form.country}
              onChange={(e) => updateField("country", e.target.value)}
              className={cn(
                "flex h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20",
                fieldErrors.country && "border-error focus:border-error focus:ring-error/20"
              )}
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
            {fieldErrors.country ? (
              <p className="text-sm text-error">{fieldErrors.country}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="address" className="block text-sm font-medium text-slate-700">
              Address
            </label>
            <textarea
              id="address"
              name="address"
              rows={2}
              value={form.address}
              onChange={(e) => updateField("address", e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <Input
            label="VAT Number"
            name="vatNumber"
            value={form.vatNumber}
            onChange={(e) => updateField("vatNumber", e.target.value)}
          />

          <div className="space-y-1.5">
            <label htmlFor="notes" className="block text-sm font-medium text-slate-700">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              value={form.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <FormSubmitError message={submitError} />

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              loading={loading}
              loadingText="Saving…"
            >
              {mode === "create" ? "Create" : "Save"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** 文本域标签样式复用 */
export function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn("block text-sm font-medium text-slate-700")}
    >
      {children}
    </label>
  );
}
