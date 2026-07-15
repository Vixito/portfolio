import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase"; // Asumiendo que el cliente de Supabase está aquí
// Iconos eliminados de lucide-react para evitar dependencias externas. Se usan SVGs nativos.

interface JobOffer {
  id: string;
  puesto: string;
  empresa: string;
  introduccion: string;
  consejos_para_aplicar: string;
  match_score: number;
  modalidad: string;
  prioridad: string;
  publicacion_oferta: string;
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
      .order("id", { ascending: false }); // Usar ID para ordenar y evitar errores de columnas de fecha
      
    if (error) {
      console.error("Error al cargar las ofertas de la BD:", error);
    } else if (data) {
      setOffers(data);
    }
    setLoading(false);
  };

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from("job_scraper_settings")
      .select("is_enabled")
      .eq("id", 1)
      .maybeSingle();
      
    if (data) {
      setIsEnabled(data.is_enabled);
    } else {
      setIsEnabled(true);
    }
  };

  useEffect(() => {
    fetchOffers();
    fetchSettings();

    // Suscribirse a cambios en job_offers para que la UI se actualice mágicamente en tiempo real
    const channel = supabase
      .channel('public:job_offers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'job_offers' }, payload => {
        console.log('Cambio detectado en job_offers!', payload);
        fetchOffers(); // Refrescar la tabla
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
      const { error } = await supabase
        .from("job_queue")
        .insert([{ url: manualUrl }]);
        
      if (!error) {
        setManualUrl("");
        alert("Oferta añadida correctamente a la cola local. El scraper de background la procesará en breve.");
      } else {
        console.error("Error al insertar en la cola:", error);
        alert("Error al añadir la URL a la cola local.");
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
        [o.empresa, o.puesto, o.match_score, o.url_oferta, new Date(o.fecha_creacion || (o as any).created_at).toLocaleDateString()].join(",")
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
            <span className="mr-2">🔌</span>
            {isEnabled ? "Scraper Activo" : "Scraper Pausado"}
          </button>
          
          <button 
            onClick={() => { fetchOffers(); fetchSettings(); }}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 border border-purple-500/50 rounded-lg text-sm font-semibold hover:bg-purple-500/30 transition-colors"
          >
            <span className="mr-1">🔄</span> Recargar
          </button>
          
          <button 
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/50 rounded-lg text-sm font-semibold hover:bg-blue-500/30 transition-colors"
          >
            <span className="mr-1">⬇️</span> CSV
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
          {isProcessingUrl ? "⏳ Procesando..." : "Procesar Link"}
        </button>
      </form>

      {/* TABLE */}
      {loading ? (
        <div className="flex justify-center py-10"><span className="text-[#2093c4] font-bold">Cargando ofertas... ⏳</span></div>
      ) : (
        <div className="w-full overflow-x-auto rounded-xl border border-white/10 bg-[#09090b] shadow-sm">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-[#18181b] text-gray-400 border-b border-white/10">
              <tr>
                <th className="px-5 py-4 font-medium">Empresa & Puesto</th>
                <th className="px-5 py-4 font-medium">Match</th>
                <th className="px-5 py-4 font-medium">Modalidad & Prioridad</th>
                <th className="px-5 py-4 font-medium">Introducción</th>
                <th className="px-5 py-4 font-medium">Consejos</th>
                <th className="px-5 py-4 font-medium">Fechas</th>
                <th className="px-5 py-4 font-medium text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {offers.map((offer) => (
                <tr key={offer.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-4 align-top">
                    <div className="font-semibold text-[#3b82f6] truncate max-w-[150px]" title={offer.empresa}>
                      {offer.empresa}
                    </div>
                    <div className="text-xs text-gray-400 mt-1 truncate max-w-[150px]" title={offer.puesto}>
                      {offer.puesto}
                    </div>
                  </td>
                  <td className="px-5 py-4 align-top">
                    <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${offer.match_score >= 80 ? 'bg-green-500/10 text-green-400 border-green-500/20' : offer.match_score >= 50 ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                      {offer.match_score}%
                    </span>
                  </td>
                  <td className="px-5 py-4 align-top text-xs text-gray-400">
                    <div>Mod: <span className="text-gray-300">{offer.modalidad || '-'}</span></div>
                    <div className="mt-1">Prio: <span className="text-gray-300">{offer.prioridad || '-'}</span></div>
                  </td>
                  <td className="px-5 py-4 align-top text-xs text-gray-400">
                    <div className="line-clamp-2" title={offer.introduccion}>{offer.introduccion}</div>
                  </td>
                  <td className="px-5 py-4 align-top text-xs text-gray-400">
                    <div className="line-clamp-2" title={offer.consejos_para_aplicar}>{offer.consejos_para_aplicar}</div>
                  </td>
                  <td className="px-5 py-4 align-top text-xs text-gray-400">
                    <div>Pub: {offer.publicacion_oferta ? new Date(offer.publicacion_oferta).toLocaleDateString() : '-'}</div>
                    <div className="mt-1">Cre: {new Date(offer.fecha_creacion || (offer as any).created_at).toLocaleDateString()}</div>
                  </td>
                  <td className="px-5 py-4 align-top">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => setSelectedOffer(offer)} className="p-2 bg-[#27272a] hover:bg-[#3f3f46] text-gray-300 rounded-md transition-colors" title="Ver detalle">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      </button>
                      {offer.url_oferta && (
                        <a href={offer.url_oferta} target="_blank" rel="noreferrer" className="p-2 bg-[#27272a] hover:bg-[#3f3f46] text-gray-300 rounded-md transition-colors" title="Abrir Link">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                        </a>
                      )}
                      <button onClick={() => handleDelete(offer.id!)} className="p-2 bg-red-950/30 hover:bg-red-900/50 text-red-400 rounded-md transition-colors border border-red-900/50" title="Eliminar">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedOffers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">No hay ofertas guardadas.</td>
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

      {/* MODAL SHADCN STYLE */}
      {selectedOffer && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-5xl bg-[#09090b] border border-white/10 rounded-xl shadow-2xl flex flex-col max-h-full">
            {/* Header */}
            <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center sticky top-0 bg-[#09090b]/90 backdrop-blur z-10 rounded-t-xl">
              <div className="flex items-center gap-4">
                <span className={`inline-flex items-center justify-center px-3 py-1 rounded-md text-sm font-semibold border ${selectedOffer.match_score >= 80 ? 'bg-green-500/10 text-green-400 border-green-500/20' : selectedOffer.match_score >= 50 ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                  {selectedOffer.match_score}% Match
                </span>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-100">{selectedOffer.puesto}</h1>
                  <p className="text-[#3b82f6] text-sm font-medium mt-0.5">{selectedOffer.empresa}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedOffer(null)} 
                className="p-2 bg-transparent hover:bg-white/5 text-gray-400 hover:text-gray-100 rounded-md transition-colors"
                title="Cerrar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-[#18181b] p-5 rounded-lg border border-white/5">
                    <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">Introducción (Cover Letter)</h3>
                    <p className="text-gray-300 text-sm sm:text-base leading-relaxed whitespace-pre-wrap">{selectedOffer.introduccion}</p>
                  </div>
                  
                  <div className="bg-[#18181b] p-5 rounded-lg border border-white/5">
                    <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">Consejos para Aplicar</h3>
                    <p className="text-gray-300 text-sm sm:text-base leading-relaxed whitespace-pre-wrap">{selectedOffer.consejos_para_aplicar}</p>
                  </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  <div className="bg-[#18181b] p-5 rounded-lg border border-white/5">
                    <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Detalles de la Vacante</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-gray-400">Modalidad</span>
                        <span className="text-gray-200 font-medium">{selectedOffer.modalidad || '-'}</span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-gray-400">Prioridad</span>
                        <span className="text-gray-200 font-medium">{selectedOffer.prioridad || 'No asignada'}</span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-gray-400">Match AI</span>
                        <span className="text-gray-200 font-medium">{selectedOffer.match_score}%</span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-gray-400">Publicada</span>
                        <span className="text-gray-200 font-medium">{selectedOffer.publicacion_oferta ? new Date(selectedOffer.publicacion_oferta).toLocaleDateString() : '-'}</span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-gray-400">Guardada el</span>
                        <span className="text-gray-200 font-medium">{new Date(selectedOffer.fecha_creacion || (selectedOffer as any).created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <a href={selectedOffer.url_oferta} target="_blank" rel="noreferrer" className="mt-5 flex items-center justify-center gap-2 w-full py-2.5 bg-[#27272a] hover:bg-[#3f3f46] text-gray-200 text-sm font-medium rounded-md transition-colors border border-white/5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      Abrir Oferta Original
                    </a>
                  </div>

                  <div className="pt-2">
                    {selectedOffer.cv_generado_url ? (
                      <a 
                        href={selectedOffer.cv_generado_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-3 bg-[#10b981] hover:bg-[#059669] text-white font-medium text-sm rounded-md transition-colors shadow-sm"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        Descargar CV Generado
                      </a>
                    ) : (
                      <div className="flex items-center justify-center w-full py-3 bg-[#18181b] text-gray-500 font-medium text-sm rounded-md border border-dashed border-white/10">
                        CV No Disponible
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
