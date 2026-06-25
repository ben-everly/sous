import { Input } from '@/components/ui/input'

type FormFieldProps = {
  name: string
  label: string
  type?: string
  autoComplete?: string
  error?: string
}

// Label + Input + inline error, with the `aria-invalid`/`aria-describedby` wiring kept
// in one place so it can't drift across forms. The error element id derives from `name`.
export function FormField({ name, label, type = 'text', autoComplete, error }: FormFieldProps) {
  const errorId = `${name}-error`
  return (
    <div className="space-y-1">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      <Input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
      />
      {error && (
        <p id={errorId} role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  )
}
