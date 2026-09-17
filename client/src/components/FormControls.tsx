import { ChangeEvent } from "react";

type SelectOption = string | { value: string; label: string };

type FieldProps = {
  label: string;
  name: string;
  value: string;
  onChange: (name: string, value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
};

export function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder,
  required = true,
}: FieldProps) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        required={required}
        type={type}
        name={name}
        value={value}
        placeholder={placeholder}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onChange(name, event.target.value)
        }
      />
    </label>
  );
}

export function SelectField({
  label,
  name,
  value,
  onChange,
  options,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (name: string, value: string) => void;
  options: SelectOption[];
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select
        name={name}
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
      >
        {options.map((option) => {
          const item =
            typeof option === "string"
              ? { value: option, label: option }
              : option;
          return (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          );
        })}
      </select>
    </label>
  );
}
