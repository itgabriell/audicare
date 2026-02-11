import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error("Uncaught error:", error, errorInfo);

    // --- CHUNK LOAD ERROR AUTO-RECOVERY ---
    // If we fail to load a module (often due to a new deployment where hashes changed)
    // we force a hard reload of the application.
    const isChunkLoadError =
      error.name === 'ChunkLoadError' ||
      error.message?.includes('Failed to fetch dynamically imported module') ||
      error.message?.includes('Expected a JavaScript-or-Wasm module script');

    if (isChunkLoadError) {
      console.warn("[ErrorBoundary] ChunkLoadError detected. Persistent recovery via hard reload...");
      // Add a small delay for dev visibility, then reload
      setTimeout(() => {
        window.location.reload(true);
      }, 500);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    // You might want to reload the page for a hard reset
    // window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
          <Card className="w-full max-w-md text-center border-destructive">
            <CardHeader>
              <CardTitle className="flex flex-col items-center gap-2 text-destructive">
                <AlertTriangle className="h-10 w-10" />
                Oops! Algo deu errado.
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Ocorreu um erro inesperado na aplicação. Nossa equipe foi notificada.
              </p>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4 text-left bg-muted p-2 rounded-md text-xs">
                  <summary className="cursor-pointer">Detalhes do erro</summary>
                  <pre className="mt-2 whitespace-pre-wrap break-all">
                    {this.state.error.toString()}
                  </pre>
                </details>
              )}
            </CardContent>
            <CardFooter className="flex justify-center">
              <Button onClick={() => window.location.reload()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Recarregar Página
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;