import React from 'react';
import Chat from './Chat';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error('❌ React Error Boundary capturou erro:', error, errorInfo);
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    padding: '20px',
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    color: 'white',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
                    minHeight: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <h2 style={{ fontSize: '24px', marginBottom: '20px' }}>❌ Erro na Aplicação</h2>
                    <div style={{
                        background: 'rgba(0,0,0,0.2)',
                        padding: '15px',
                        borderRadius: '10px',
                        maxWidth: '90%',
                        overflow: 'auto'
                    }}>
                        <p><strong>Erro:</strong> {this.state.error && this.state.error.toString()}</p>
                        {this.state.errorInfo && (
                            <details style={{ marginTop: '10px' }}>
                                <summary style={{ cursor: 'pointer' }}>Stack Trace</summary>
                                <pre style={{ fontSize: '12px', whiteSpace: 'pre-wrap', marginTop: '10px' }}>
                                    {this.state.errorInfo.componentStack}
                                </pre>
                            </details>
                        )}
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            marginTop: '20px',
                            padding: '12px 24px',
                            background: 'white',
                            color: '#ef4444',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '16px',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                    >
                        🔄 Recarregar Página
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

function App() {
    console.log('🎨 App.js renderizando...');
    
    return (
        <ErrorBoundary>
            <div className="App">
                <Chat />
            </div>
        </ErrorBoundary>
    );
}

export default App;
