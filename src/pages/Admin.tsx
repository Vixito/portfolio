import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { gsap } from "gsap";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

function Admin() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminKey, setAdminKey] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Verificar key de autenticación
  useEffect(() => {
    const key = searchParams.get("key");
    const validKey = "llaverandom"; // En producción, esto vendría de variables de entorno

    if (key === validKey) {
      setIsAuthenticated(true);
    } else {
      // Si no hay key válida, redirigir o mostrar error
      if (key) {
        alert("Key de acceso inválida");
      }
    }
  }, [searchParams]);

  // Animación de entrada
  useEffect(() => {
    if (isAuthenticated && containerRef.current) {
      const elements = containerRef.current.querySelectorAll(".admin-card");
      gsap.fromTo(
        elements,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.1,
          ease: "power2.out",
        }
      );
    }
  }, [isAuthenticated]);

  // Datos mock para estadísticas
  const statsData = [
    { name: "Lun", visitas: 120, usuarios: 45 },
    { name: "Mar", visitas: 190, usuarios: 67 },
    { name: "Mié", visitas: 300, usuarios: 89 },
    { name: "Jue", visitas: 280, usuarios: 78 },
    { name: "Vie", visitas: 350, usuarios: 95 },
  ];

  const pageViews = [
    { page: "Home", views: 1250 },
    { page: "Projects", views: 890 },
    { page: "Blog", views: 650 },
    { page: "About", views: 420 },
    { page: "Status", views: 380 },
  ];

  const statusDistribution = [
    { name: "Activo", value: 75, color: "#10b981" },
    { name: "Inactivo", value: 15, color: "#f59e0b" },
    { name: "Error", value: 10, color: "#ef4444" },
  ];

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">
            Acceso Restringido
          </h1>
          <p className="text-gray-300">
            Por favor, proporciona una key válida en la URL: ?key=tu_key
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 py-20 px-4"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header estilo Jarvis */}
        <div className="text-center mb-12">
          <h1
            className="text-6xl md:text-7xl font-extrabold tracking-tight mb-4"
            style={{
              background:
                "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              textShadow: "0 0 40px rgba(118, 75, 162, 0.5)",
            }}
          >
            JARVIS
          </h1>
          <p className="text-gray-300 text-lg">
            Panel de Administración - Vixis Portfolio
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-green-400 text-sm">Sistema Operativo</span>
          </div>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="admin-card bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
            <div className="text-gray-300 text-sm mb-2">Visitas Totales</div>
            <div className="text-3xl font-bold text-white">12,450</div>
            <div className="text-green-400 text-xs mt-2">↑ 12% este mes</div>
          </div>
          <div className="admin-card bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
            <div className="text-gray-300 text-sm mb-2">Usuarios Únicos</div>
            <div className="text-3xl font-bold text-white">3,280</div>
            <div className="text-green-400 text-xs mt-2">↑ 8% este mes</div>
          </div>
          <div className="admin-card bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
            <div className="text-gray-300 text-sm mb-2">Tiempo Promedio</div>
            <div className="text-3xl font-bold text-white">4:32</div>
            <div className="text-blue-400 text-xs mt-2">↑ 15% este mes</div>
          </div>
          <div className="admin-card bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
            <div className="text-gray-300 text-sm mb-2">Tasa de Rebote</div>
            <div className="text-3xl font-bold text-white">32%</div>
            <div className="text-red-400 text-xs mt-2">↓ 5% este mes</div>
          </div>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Gráfico de líneas - Visitas y usuarios */}
          <div className="admin-card bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
            <h2 className="text-xl font-bold text-white mb-4">
              Visitas y Usuarios (Semana)
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={statsData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.1)"
                />
                <XAxis dataKey="name" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(0,0,0,0.8)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="visitas"
                  stroke="#667eea"
                  strokeWidth={2}
                  name="Visitas"
                />
                <Line
                  type="monotone"
                  dataKey="usuarios"
                  stroke="#f093fb"
                  strokeWidth={2}
                  name="Usuarios"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico de barras - Vistas por página */}
          <div className="admin-card bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
            <h2 className="text-xl font-bold text-white mb-4">
              Vistas por Página
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={pageViews}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.1)"
                />
                <XAxis dataKey="page" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(0,0,0,0.8)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="views" fill="#764ba2" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de pastel y acciones rápidas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Gráfico de pastel - Estado del sistema */}
          <div className="admin-card bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
            <h2 className="text-xl font-bold text-white mb-4 text-center">
              Estado del Sistema
            </h2>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    percent ? `${name}: ${(percent * 100).toFixed(0)}%` : name
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(0,0,0,0.8)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: "8px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Acciones rápidas */}
          <div className="admin-card bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20 lg:col-span-2">
            <h2 className="text-xl font-bold text-white mb-4">
              Acciones Rápidas
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <button className="p-4 bg-purple/20 hover:bg-purple/30 rounded-lg border border-purple/30 text-white transition-colors cursor-pointer">
                <div className="text-2xl mb-2">📝</div>
                <div className="text-sm font-semibold">Nuevo Post</div>
              </button>
              <button className="p-4 bg-blue/20 hover:bg-blue/30 rounded-lg border border-blue/30 text-white transition-colors cursor-pointer">
                <div className="text-2xl mb-2">📊</div>
                <div className="text-sm font-semibold">Ver Estadísticas</div>
              </button>
              <button className="p-4 bg-green/20 hover:bg-green/30 rounded-lg border border-green/30 text-white transition-colors cursor-pointer">
                <div className="text-2xl mb-2">⚙️</div>
                <div className="text-sm font-semibold">Configuración</div>
              </button>
              <button className="p-4 bg-yellow/20 hover:bg-yellow/30 rounded-lg border border-yellow/30 text-white transition-colors cursor-pointer">
                <div className="text-2xl mb-2">👥</div>
                <div className="text-sm font-semibold">Usuarios</div>
              </button>
              <button className="p-4 bg-red/20 hover:bg-red/30 rounded-lg border border-red/30 text-white transition-colors cursor-pointer">
                <div className="text-2xl mb-2">🔒</div>
                <div className="text-sm font-semibold">Seguridad</div>
              </button>
              <button className="p-4 bg-pink/20 hover:bg-pink/30 rounded-lg border border-pink/30 text-white transition-colors cursor-pointer">
                <div className="text-2xl mb-2">📦</div>
                <div className="text-sm font-semibold">Backup</div>
              </button>
            </div>
          </div>
        </div>

        {/* Logs recientes */}
        <div className="mt-8 admin-card bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
          <h2 className="text-xl font-bold text-white mb-4">Logs Recientes</h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {[
              {
                time: "10:23:45",
                type: "info",
                message: "Usuario autenticado",
              },
              { time: "10:20:12", type: "success", message: "Post publicado" },
              {
                time: "10:15:33",
                type: "warning",
                message: "Alta carga de tráfico",
              },
              { time: "10:10:01", type: "info", message: "Backup completado" },
              { time: "10:05:22", type: "error", message: "Error en API" },
            ].map((log, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-2 bg-black/20 rounded text-sm"
              >
                <span className="text-gray-400 font-mono text-xs">
                  {log.time}
                </span>
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    log.type === "error"
                      ? "bg-red-500/20 text-red-300"
                      : log.type === "success"
                      ? "bg-green-500/20 text-green-300"
                      : log.type === "warning"
                      ? "bg-yellow-500/20 text-yellow-300"
                      : "bg-blue-500/20 text-blue-300"
                  }`}
                >
                  {log.type.toUpperCase()}
                </span>
                <span className="text-gray-300">{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Admin;
