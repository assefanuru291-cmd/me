import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [react()],
    server: {
        host: '127.0.0.1',
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:5000',
                changeOrigin: true,
                secure: false,
                // When the API is not running the proxy answers with an empty
                // 502 body, which makes the browser fail with an opaque
                // "Unexpected end of JSON input". Answer with JSON instead so
                // the application can show a readable message.
                configure: (proxy) => {
                    proxy.on('error', (error, request, response) => {
                        if (!response || response.headersSent) return;
                        if (response.writeHead) {
                            response.writeHead(502, { 'Content-Type': 'application/json' });
                            response.end(
                                JSON.stringify({
                                    error: 'Cannot reach the API server. Make sure the backend is running on port 5000.',
                                    code: 'API_UNREACHABLE'
                                })
                            );
                            return;
                        }
                        response.end();
                    });
                }
            }
        }
    }
});
