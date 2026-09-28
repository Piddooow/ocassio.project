import type { ChangeEvent, ReactNode } from "react";

/**
 * Shared form primitives (§31.21): 44-48px controls, 8px radius,
 * theme surfaces, specific error messaging with keyboard focus support.
 */

export const INPUT_CLASS =
  "h-11 w-full rounded-md border border-line bg-surface px-4 text-body text-primary transition-colors duration-300 placeholder:text-muted focus:border-line-strong";

export const TEXTAREA_CLASS = `${INPUT_CLASS} h-auto min-h-32 py-3`;

export const SELECT_CLASS = `${INPUT_CLASS} appearance-none pr-10`;

interface FormFieldProps {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}

export function FormField({
  id,
  label,
  required = false,
  error,
  hint,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="text-label uppercase tracking-label-wide text-secondary"
      >
        {label}
        {required ? " *" : ""}
      </label>
      <div className="mt-2">{children}</div>
      {error ? (
        <p id={`${id}-error`} className="mt-2 text-caption text-error">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-2 text-caption text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

interface TextInputProps {
  id: string;
  name: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  type?: "text" | "email" | "tel" | "url" | "date" | "password";
  autoComplete?: string;
  inputMode?: "text" | "email" | "tel" | "url";
  placeholder?: string;
  error?: string;
}

export function TextInput({
  id,
  name,
  value,
  onChange,
  type = "text",
  autoComplete,
  inputMode,
  placeholder,
  error,
}: TextInputProps) {
  return (
    <input
      id={id}
      name={name}
      type={type}
      autoComplete={autoComplete}
      inputMode={inputMode}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? `${id}-error` : undefined}
      className={`${INPUT_CLASS}${error ? " border-error" : ""}`}
    />
  );
}

interface TextAreaInputProps {
  id: string;
  name: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  rows?: number;
  error?: string;
}

export function TextAreaInput({
  id,
  name,
  value,
  onChange,
  rows = 5,
  error,
}: TextAreaInputProps) {
  return (
    <textarea
      id={id}
      name={name}
      rows={rows}
      value={value}
      onChange={onChange}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? `${id}-error` : undefined}
      className={`${TEXTAREA_CLASS}${error ? " border-error" : ""}`}
    />
  );
}

interface SelectInputProps {
  id: string;
  name: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  options: readonly string[];
  placeholder: string;
  error?: string;
}

export function SelectInput({
  id,
  name,
  value,
  onChange,
  options,
  placeholder,
  error,
}: SelectInputProps) {
  return (
    <select
      id={id}
      name={name}
      value={value}
      onChange={onChange}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? `${id}-error` : undefined}
      className={`${SELECT_CLASS}${error ? " border-error" : ""}`}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}
