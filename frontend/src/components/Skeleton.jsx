/**
 * Skeleton loading components for better perceived performance
 */

export function ClassCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between gap-3 rounded-lg px-3.5 py-2.5 bg-slate-50">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-200 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-slate-200 rounded w-1/2" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-20 bg-slate-200 rounded-lg" />
          <div className="w-9 h-9 rounded-lg bg-slate-200" />
        </div>
      </div>
    </div>
  )
}

export function ClassListSkeleton({ count = 5 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <ClassCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function TableRowSkeleton({ columns = 4 }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-slate-200 rounded w-full" />
        </td>
      ))}
    </tr>
  )
}

export function TableSkeleton({ rows = 5, columns = 4 }) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRowSkeleton key={i} columns={columns} />
      ))}
    </tbody>
  )
}

export function StudentCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-slate-200 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="h-5 bg-slate-200 rounded w-1/2 mb-2" />
            <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
            <div className="h-3 bg-slate-200 rounded w-1/3" />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="h-8 bg-slate-200 rounded" />
          <div className="h-8 bg-slate-200 rounded" />
          <div className="h-8 bg-slate-200 rounded" />
        </div>
      </div>
    </div>
  )
}

export function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="h-4 bg-slate-200 rounded w-1/3 mb-4" />
          <div className="h-8 bg-slate-200 rounded w-1/2 mb-2" />
          <div className="h-3 bg-slate-200 rounded w-1/4" />
        </div>
      ))}
    </div>
  )
}

export function ButtonSkeleton({ width = 'w-20' }) {
  return (
    <div className={`animate-pulse h-10 ${width} bg-slate-200 rounded-lg`} />
  )
}

export function PageHeaderSkeleton() {
  return (
    <div className="animate-pulse mb-6">
      <div className="h-8 bg-slate-200 rounded w-1/3 mb-2" />
      <div className="h-4 bg-slate-200 rounded w-1/2" />
    </div>
  )
}
