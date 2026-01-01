#!/usr/bin/env python3
"""
Servidor HTTP simple para health check en el puerto 8000
Optimizado para usar mínima memoria (256MB RAM)
"""
import http.server
import socketserver
import sys

PORT = 8000

class HealthCheckHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Responder siempre con 200 OK para el health check
        self.send_response(200)
        self.send_header('Content-type', 'text/plain')
        self.end_headers()
        self.wfile.write(b'OK')
    
    def log_message(self, format, *args):
        # Desactivar logs para reducir uso de memoria
        pass

if __name__ == '__main__':
    try:
        with socketserver.TCPServer(("", PORT), HealthCheckHandler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        sys.exit(0)
    except Exception as e:
        sys.exit(1)

