// Picks a valid tab value, falling back to the first option.
export function pickOption(options: { value: string }[], value: string | null) {
  return options.find((o) => o.value === value)?.value ?? options[0]?.value ?? ''
}
