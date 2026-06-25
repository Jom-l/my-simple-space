const COLORS = {
  online: 'bg-status-online',
  do_not_disturb: 'bg-status-dnd',
  away: 'bg-status-away',
  offline: 'bg-status-offline',
}

const LABELS = {
  online: 'Online',
  do_not_disturb: 'Do not disturb',
  away: 'Away',
  offline: 'Offline',
}

export function StatusDot({ status = 'offline', size = 12 }) {
  return (
    <span
      title={LABELS[status]}
      className={`inline-block rounded-full ring-2 ring-white ${COLORS[status] || COLORS.offline}`}
      style={{ width: size, height: size }}
    />
  )
}

export { LABELS as STATUS_LABELS }
