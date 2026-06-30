import { clsx } from 'clsx'

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  dot?: boolean
  className?: string
}

export function Badge({ children, variant = 'default', dot, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        {
          'bg-slate-800 text-slate-300': variant === 'default',
          'bg-emerald-950 text-emerald-400 ring-1 ring-emerald-800/50': variant === 'success',
          'bg-amber-950 text-amber-400 ring-1 ring-amber-800/50': variant === 'warning',
          'bg-red-950 text-red-400 ring-1 ring-red-800/50': variant === 'error',
          'bg-blue-950 text-blue-400 ring-1 ring-blue-800/50': variant === 'info',
          'bg-violet-950 text-violet-400 ring-1 ring-violet-800/50': variant === 'purple',
        },
        className
      )}
    >
      {dot && (
        <span
          className={clsx('h-1.5 w-1.5 rounded-full', {
            'bg-slate-400': variant === 'default',
            'bg-emerald-400 animate-pulse': variant === 'success',
            'bg-amber-400 animate-pulse': variant === 'warning',
            'bg-red-400': variant === 'error',
            'bg-blue-400': variant === 'info',
            'bg-violet-400 animate-pulse': variant === 'purple',
          })}
        />
      )}
      {children}
    </span>
  )
}
