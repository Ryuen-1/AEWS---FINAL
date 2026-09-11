export default function DashboardPageHeader({
  eyebrow,
  title,
  description,
  actions = null,
  children = null,
  welcome = false,
  accent = 'blue',
}) {
  const welcomeTone = accent === 'slate' ? 'from-slate-100 via-white to-slate-50 border-slate-200' : 'from-blue-50 via-white to-indigo-50 border-blue-100'
  return (
    <section className="rounded-xl border border-slate-200/80 bg-white shadow-md shadow-slate-200/40 overflow-hidden">
      <div className={welcome ? `relative overflow-hidden px-5 py-7 sm:px-7 border-b bg-gradient-to-br ${welcomeTone}` : 'px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-white'}>
        {welcome && <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full border-[30px] border-slate-200/30" />}
        <div className={`relative flex flex-col gap-3 ${welcome ? '' : 'lg:flex-row lg:items-start lg:justify-between'}`}>
          <div className="min-w-0">
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
