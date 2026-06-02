const COUNT_LABELS = {
  running: '运行台数',
  standby: '待机台数',
  defrosting: '化霜台数',
  malfunction: '故障台数',
}

function formatStatusCount(value) {
  return String(Number(value) || 0)
}

function HomeUnitStatusBlock({ title, summary, className = '' }) {
  return (
    <div className={`home-system-node home-unit-status-block ${className}`.trim()}>
      <div className="home-system-caption home-system-caption--title">{title}</div>
      <div className="home-system-row">
        <span className="home-system-caption">{COUNT_LABELS.running}</span>
        <span className="home-system-value">{formatStatusCount(summary?.running)}</span>
      </div>
      <div className="home-system-row">
        <span className="home-system-caption">{COUNT_LABELS.standby}</span>
        <span className="home-system-value">{formatStatusCount(summary?.shutdown)}</span>
      </div>
      <div className="home-system-row">
        <span className="home-system-caption">{COUNT_LABELS.defrosting}</span>
        <span className="home-system-value is-defrost">{formatStatusCount(summary?.defrosting)}</span>
      </div>
      <div className="home-system-row">
        <span className="home-system-caption">{COUNT_LABELS.malfunction}</span>
        <span className="home-system-value is-fault">{formatStatusCount(summary?.malfunction)}</span>
      </div>
    </div>
  )
}

export default HomeUnitStatusBlock
