"use client"

import * as React from "react"
import Select, { type MultiValue, type StylesConfig } from "react-select"
import { cn } from "@/lib/utils"

export interface MultiSelectOption {
  label: string
  value: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  value: MultiSelectOption[]
  onChange: (value: MultiSelectOption[]) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

const getStyles = (hasError?: boolean): StylesConfig<MultiSelectOption, true> => ({
  control: (base, state) => ({
    ...base,
    minHeight: "2.25rem",
    borderRadius: "var(--radius-md)",
    borderColor: hasError
      ? "var(--destructive)"
      : state.isFocused
        ? "var(--ring)"
        : "var(--input)",
    boxShadow: state.isFocused
      ? `0 0 0 3px color-mix(in oklch, var(--ring) 20%, transparent)`
      : "none",
    backgroundColor: "var(--background)",
    "&:hover": {
      borderColor: hasError ? "var(--destructive)" : "var(--ring)",
    },
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
    cursor: "pointer",
  }),
  valueContainer: (base) => ({
    ...base,
    padding: "0.25rem 0.5rem",
    gap: "0.25rem",
  }),
  multiValue: (base) => ({
    ...base,
    backgroundColor: "var(--secondary)",
    borderRadius: "calc(var(--radius-md) - 2px)",
    margin: 0,
    fontSize: "0.75rem",
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: "var(--secondary-foreground)",
    padding: "0.125rem 0.375rem",
    fontSize: "0.75rem",
  }),
  multiValueRemove: (base) => ({
    ...base,
    color: "var(--secondary-foreground)",
    borderRadius: "0 calc(var(--radius-md) - 2px) calc(var(--radius-md) - 2px) 0",
    padding: "0.125rem 0.25rem",
    "&:hover": {
      backgroundColor: "var(--destructive)",
      color: "var(--destructive-foreground)",
    },
  }),
  input: (base) => ({
    ...base,
    color: "var(--foreground)",
    margin: 0,
    padding: 0,
  }),
  placeholder: (base) => ({
    ...base,
    color: "var(--muted-foreground)",
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
    boxShadow:
      "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    overflow: "hidden",
    zIndex: 50,
  }),
  menuPortal: (base) => ({
    ...base,
    zIndex: 100,
  }),
  menuList: (base) => ({
    ...base,
    padding: "0.25rem",
  }),
  option: (base, state) => ({
    ...base,
    borderRadius: "calc(var(--radius-md) - 2px)",
    padding: "0.375rem 0.5rem",
    fontSize: "0.875rem",
    cursor: "pointer",
    backgroundColor: state.isSelected
      ? "var(--accent)"
      : state.isFocused
        ? "var(--accent)"
        : "transparent",
    color: state.isSelected
      ? "var(--accent-foreground)"
      : "var(--popover-foreground)",
    "&:active": {
      backgroundColor: "var(--accent)",
    },
  }),
  indicatorSeparator: () => ({
    display: "none",
  }),
  dropdownIndicator: (base, state) => ({
    ...base,
    color: "var(--muted-foreground)",
    padding: "0.25rem",
    transition: "transform 200ms",
    transform: state.selectProps.menuIsOpen ? "rotate(180deg)" : "rotate(0deg)",
    "&:hover": {
      color: "var(--foreground)",
    },
  }),
  clearIndicator: (base) => ({
    ...base,
    color: "var(--muted-foreground)",
    padding: "0.25rem",
    "&:hover": {
      color: "var(--foreground)",
    },
  }),
  noOptionsMessage: (base) => ({
    ...base,
    color: "var(--muted-foreground)",
    fontSize: "0.875rem",
    padding: "0.5rem",
  }),
})

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
  disabled = false,
  className,
}: MultiSelectProps) {
  const [menuPortalTarget, setMenuPortalTarget] = React.useState<HTMLElement | null>(null)

  React.useEffect(() => {
    setMenuPortalTarget(document.body)
  }, [])

  const handleChange = (newValue: MultiValue<MultiSelectOption>) => {
    onChange([...newValue])
  }

  return (
    <Select
      isMulti
      options={options}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      isDisabled={disabled}
      styles={getStyles()}
      menuPortalTarget={menuPortalTarget ?? undefined}
      menuPosition="fixed"
      className={cn("w-full", className)}
      classNamePrefix="react-select"
      closeMenuOnSelect={false}
      hideSelectedOptions={false}
    />
  )
}
