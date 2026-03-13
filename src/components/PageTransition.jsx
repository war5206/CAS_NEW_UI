function PageTransition({ transitionKey, className = '', children }) {
  const wrapperClassName = ['page-transition', className].filter(Boolean).join(' ')

  return (
    <div key={transitionKey} className={wrapperClassName}>
      {children}
    </div>
  )
}

export default PageTransition
