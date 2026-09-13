export default function DashboardPageHeader({
  eyebrow,
  title,
  description,
  actions = null,
  children = null,
  welcome = false,
  accent = 'blue',
  heroIcon: HeroIcon = null,
}) {
  const welcomeTone = accent === 'slate' ? 'from-slate-100 via-white to-slate-50 border-slate-200' : 'from-blue-50 via-white to-indigo-50 border-blue-100'
  const heroTone = accent === 'slate'
    ? {
        ring: 'border-slate-200/35',
        iconWrap: 'bg-white text-slate-700 shadow-slate-200/70',
        glow: 'bg-slate-200/35',
      }
    : {
        ring: 'border-blue-200/35',
        iconWrap: 'bg-white text-blue-600 shadow-blue-200/70',
        glow: 'bg-blue-200/35',
      }
  return (
    <section className="ui-surface soft-enter rounded-xl border border-slate-200/80 bg-white shadow-md shadow-slate-200/40 overflow-hidden">
      <div className={welcome ? `relative overflow-hidden px-5 py-7 sm:px-7 border-b bg-gradient-to-br ${welcomeTone}` : 'px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-white'}>
        {welcome && <div aria-hidden="true" className={`pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full border-[30px] ${heroTone.ring}`} />}
        {welcome && HeroIcon && (
          <div className="pointer-events-none absolute right-7 top-7 hidden h-24 w-24 items-center justify-center lg:flex" aria-hidden="true">
            <div className={`absolute h-32 w-32 rounded-full ${heroTone.glow} blur-2xl`} />
            <div className={`relative flex h-20 w-20 items-center justify-center rounded-2xl border border-slate-200/70 ${heroTone.iconWrap} shadow-lg transition-transform duration-300 hover:scale-[1.03]`}>
              <HeroIcon className="h-9 w-9" strokeWidth={2.1} />
            </div>
          </div>
        )}
        <div className={`relative flex flex-col gap-3 ${welcome ? '' : 'lg:flex-row lg:items-start lg:justify-between'}`}>
          <div className={welcome && HeroIcon ? 'min-w-0 lg:pr-36' : 'min-w-0'}>
            {eyebrow && (
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {eyebrow}
              </p>
            )}
            <h2 className={`${welcome ? 'mt-3 text-2xl sm:text-3xl' : 'mt-1 text-xl'} font-bold tracking-tight text-slate-900`}>{title}</h2>
            {description && (
              <p className="mt-1 text-sm leading-6 text-slate-500 max-w-2xl">{description}</p>
            )}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      </div>
      {children && <div className="p-5">{children}</div>}
    </section>
  )
}
