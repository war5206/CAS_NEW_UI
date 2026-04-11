import { Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Uncaught render error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.container}>
          <div style={styles.card}>
            <h2 style={styles.title}>系统异常</h2>
            <p style={styles.message}>页面发生错误，请尝试刷新或联系管理员。</p>
            {import.meta.env.DEV && this.state.error ? (
              <pre style={styles.detail}>{String(this.state.error)}</pre>
            ) : null}
            <div style={styles.actions}>
              <button type="button" style={styles.button} onClick={this.handleReset}>
                重试
              </button>
              <button
                type="button"
                style={{ ...styles.button, ...styles.secondaryButton }}
                onClick={() => window.location.reload()}
              >
                刷新页面
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    minHeight: '100vh',
    background: '#0a1628',
    color: '#e0e6ed',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  card: {
    textAlign: 'center',
    padding: '48px',
    borderRadius: '12px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    maxWidth: '480px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 600,
    margin: '0 0 12px',
    color: '#ff6b6b',
  },
  message: {
    fontSize: '14px',
    color: '#8899aa',
    margin: '0 0 24px',
  },
  detail: {
    fontSize: '12px',
    color: '#ff8888',
    background: 'rgba(255,0,0,0.08)',
    padding: '12px',
    borderRadius: '6px',
    textAlign: 'left',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    margin: '0 0 24px',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
  },
  button: {
    padding: '10px 28px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    background: '#1a73e8',
    color: '#fff',
  },
  secondaryButton: {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#8899aa',
  },
}

export default ErrorBoundary
