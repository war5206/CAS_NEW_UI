function ModulePage({ routeInfo }) {
  const { module, section, tab } = routeInfo

  return (
    <div className="placeholder-card module-placeholder">
      <div className="placeholder-title">{module.label}模块</div>
      <div className="placeholder-meta">当前页面：{section?.label ?? '一级模块'}</div>
      {tab ? <div className="placeholder-meta">当前 Tab：{tab.label}</div> : null}
      <div className="placeholder-note">内容区域待填充</div>
    </div>
  )
}

export default ModulePage
