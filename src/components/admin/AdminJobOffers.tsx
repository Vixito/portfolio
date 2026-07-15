import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase"; // Asumiendo que el cliente de Supabase está aquí
import { Loader2, Trash2, Download, Eye, ExternalLink, Power } from "lucide-react";

interface JobOffer {
  id: string;
  puesto: string;
  empresa: string;
  introduccion: string;
  consejos_para_aplicar: string;
  match_score: number;
  modalidad: string;
  url_oferta: string;
  cv_generado_url: string;
  fecha_creacion: string;
}

export default function AdminJobOffers() {
  const [offers, setOffers] = useState<JobOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEnabled, setIsEnabled] = useState(true);
  
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;
  
  const [manualUrl, setManualUrl] = useState("");
  const [isProcessingUrl, setIsProcessingUrl] = useState(false);
  
  const [selectedOffer, setSelectedOffer] = useState<JobOffer | null>(null);

  const fetchOffers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("job_offers")
      .select("*")
      .order("fecha_creacion", { ascending: false });
      
    if (!error && data) {
      setOffers(data);
    }
    setLoading(false);
  };

  const fetchSettings = async () => {
    const { data } = await supabase
      .from("job_scraper_settings")
      .select("is_enabled")
      .eq("id", 1)
      .single();
    if (data) setIsEnabled(data.is_enabled);
  };

  useEffect(() => {
    fetchOffers();
    fetchSettings();
  }, []);

  const toggleScraper = async () => {
    const newState = !isEnabled;
    setIsEnabled(newState);
    await supabase
      .from("job_scraper_settings")
      .update({ is_enabled: newState })
      .eq("id", 1);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta oferta?")) return;
    await supabase.from("job_offers").delete().eq("id", id);
    setOffers(offers.filter(o => o.id !== id));
  };

  const handleManualUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualUrl) return;
    setIsProcessingUrl(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-job-url`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({ url: manualUrl })
        }
      );
      if (res.ok) {
        setManualUrl("");
        fetchOffers();
        alert("Oferta añadida correctamente.");
      } else {
        alert("Error procesando la URL.");
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión.");
    }
    setIsProcessingUrl(false);
  };

  const exportToCSV = () => {
    const headers = ["Empresa", "Puesto", "Match Score", "URL", "Fecha"];
    const csvContent = [
      headers.join(","),
      ...offers.map(o => 
        [o.empresa, o.puesto, o.match_score, o.url_oferta, new Date(o.fecha_creacion).toLocaleDateString()].join(",")
      )
    ].join("\\n");
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `job_offers_${new Date().getTime()}.csv`;
    a.click();
  };

  const paginatedOffers = offers.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const totalPages = Math.ceil(offers.length / itemsPerPage);

  return (
    <div className="bg-[#121212] p-6 rounded-xl border border-white/10 text-white space-y-6">
      
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold font-['Poppins']">Ofertas de Trabajo</h2>
          <p className="text-gray-400 text-sm">Gestiona tus ofertas scrapeadas y evaluadas por IA.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleScraper}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${isEnabled ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-red-500/20 text-red-400 border border-red-500/50'}`}
          >
            <Power size={16} />
            {isEnabled ? "Scraper Activo" : "Scraper Pausado"}
          </button>
          
          <button 
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/50 rounded-lg text-sm font-semibold hover:bg-blue-500/30 transition-colors"
          >
            <Download size={16} /> CSV
          </button>
        </div>
      </div>

      {/* ADD MANUAL URL */}
      <form onSubmit={handleManualUrl} className="flex gap-2">
        <input 
          type="url"
          required
          placeholder="https://linkedin.com/jobs/view/..." 
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
          value={manualUrl}
          onChange={(e) => setManualUrl(e.target.value)}
        />
        <button 
          type="submit" 
          disabled={isProcessingUrl}
          className="bg-[#2093c4] hover:bg-[#1a7a9e] text-white px-6 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50"
        >
          {isProcessingUrl ? <Loader2 size={20} className="animate-spin" /> : "Procesar Link"}
        </button>
      </form>

      {/* TABLE */}
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-[#2093c4]" size={32} /></div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-gray-300">
              <tr>
                <th className="px-4 py-3 font-semibold">Empresa</th>
                <th className="px-4 py-3 font-semibold">Puesto</th>
                <th className="px-4 py-3 font-semibold text-center">Match</th>
                <th className="px-4 py-3 font-semibold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {paginatedOffers.map((offer) => (
                <tr key={offer.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 font-medium">{offer.empresa}</td>
                  <td className="px-4 py-3 text-gray-300">{offer.puesto}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${offer.match_score >= 80 ? 'bg-green-500/20 text-green-400' : offer.match_score >= 50 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                      {offer.match_score}%
                    </span>
                  </td>
                  <td className="px-4 py-3 flex justify-center gap-2">
                    <button onClick={() => setSelectedOffer(offer)} className="p-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-md transition-colors" title="Ver Detalles">
                      <Eye size={16} />
                    </button>
                    {offer.url_oferta && (
                      <a href={offer.url_oferta} target="_blank" rel="noreferrer" className="p-1.5 bg-gray-500/10 text-gray-400 hover:bg-gray-500/20 rounded-md transition-colors" title="Abrir Oferta Original">
                        <ExternalLink size={16} />
                      </a>
                    )}
                    <button onClick={() => handleDelete(offer.id)} className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-md transition-colors" title="Eliminar">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {paginatedOffers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500">No hay ofertas guardadas.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 bg-white/5 rounded-md disabled:opacity-30 hover:bg-white/10">Anterior</button>
          <span className="px-3 py-1 text-gray-400">Página {page} de {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 bg-white/5 rounded-md disabled:opacity-30 hover:bg-white/10">Siguiente</button>
        </div>
      )}

      {/* MODAL FULL SCREEN DETALLE */}
      {selectedOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 md:p-10">
          <div className="bg-[#1a1a1a] border border-white/20 w-full max-w-4xl max-h-full rounded-2xl p-6 md:p-8 overflow-y-auto relative shadow-2xl">
            <button 
              onClick={() => setSelectedOffer(null)} 
              className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors"
            >
              ✕
            </button>
            
            <div className="flex items-center gap-4 mb-6">
              <span className={`px-3 py-1 rounded-full text-lg font-bold ${selectedOffer.match_score >= 80 ? 'bg-green-500/20 text-green-400' : selectedOffer.match_score >= 50 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                {selectedOffer.match_score}% Match
              </span>
              <div>
                <h1 className="text-3xl font-bold text-white">{selectedOffer.puesto}</h1>
                <p className="text-[#2093c4] text-lg">{selectedOffer.empresa}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-200 mb-2 border-b border-white/10 pb-2">Introducción (Cover Letter)</h3>
                  <p className="text-gray-400 leading-relaxed whitespace-pre-wrap">{selectedOffer.introduccion}</p>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-200 mb-2 border-b border-white/10 pb-2">Consejos para Aplicar</h3>
                  <p className="text-gray-400 leading-relaxed whitespace-pre-wrap">{selectedOffer.consejos_para_aplicar}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                  <h3 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">Detalles</h3>
                  <p><strong>Modalidad:</strong> {selectedOffer.modalidad}</p>
                  <p><strong>Fecha:</strong> {new Date(selectedOffer.fecha_creacion).toLocaleString()}</p>
                  <a href={selectedOffer.url_oferta} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline mt-2 inline-block">🔗 Abrir Link Original</a>
                </div>

                {selectedOffer.cv_generado_url ? (
                  <a 
                    href={selectedOffer.cv_generado_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="block w-full py-4 bg-green-600 hover:bg-green-500 text-white text-center font-bold text-lg rounded-xl transition-colors shadow-lg"
                  >
                    📄 VER CV GENERADO (PDF)
                  </a>
                ) : (
                  <div className="w-full py-4 bg-gray-800 text-gray-500 text-center font-bold text-lg rounded-xl border border-gray-700 border-dashed">
                    CV No Generado
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
