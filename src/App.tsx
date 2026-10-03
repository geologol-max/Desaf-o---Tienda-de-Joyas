import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Search,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Code2,
  Terminal,
  Gem,
  Package,
  Layers,
  RefreshCw,
  Copy,
  Check,
  X,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';

interface HateoasResultItem {
  name: string;
  href: string;
}

interface HateoasResponse {
  totalJoyas: number;
  stockTotal: number;
  results: HateoasResultItem[];
}

interface JoyaItem {
  id: number;
  nombre: string;
  categoria: string;
  metal: string;
  precio: number;
  stock: number;
}

// Fotografías de alta resolución libres de Unsplash específicas para joyería fina
const JOYAS_FOTOS: Record<number, { img: string; desc: string; detalle: string }> = {
  1: {
    img: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80',
    desc: 'Colgante de corazón en oro de 18 quilates con delicado engaste artesanal.',
    detalle: 'Cadena veneciana de 45cm con dije pulido a espejo.'
  },
  2: {
    img: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=800&q=80',
    desc: 'Cadena histórica en plata fina 925 con eslabones entrelazados.',
    detalle: 'Acabado satinado de inspiración clásica y cierre reforzado.'
  },
  3: {
    img: 'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=800&q=80',
    desc: 'Argollas florales en oro amarillo macizo con textura orgánica.',
    detalle: 'Diseño liviano para uso diario con broche italiano.'
  },
  4: {
    img: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=80',
    desc: 'Pendientes colgantes en oro con piedra facetada azul zafiro.',
    detalle: 'Engarce en bisel con movimiento fluido de alta joyería.'
  },
  5: {
    img: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80',
    desc: 'Sortija Wishbone en plata esterlina con brillo impoluto.',
    detalle: 'Silueta chevron contemporánea con baño de rodio.'
  },
  6: {
    img: 'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?auto=format&fit=crop&w=800&q=80',
    desc: 'Anillo escultórico en oro labrado con cuarzo natural griego.',
    detalle: 'Gema en bruto engastada en corona inspirada en la Hélade.'
  }
};

const FOTO_DEFAULT = 'https://images.unsplash.com/photo-1531995811006-35cb42e1a022?auto=format&fit=crop&w=800&q=80';

export default function App() {
  const [activeTab, setActiveTab] = useState<'catalogo' | 'filtros' | 'api'>('catalogo');

  // Estados de control para /joyas: Límite, Paginación, Ordenamiento
  const [limits, setLimits] = useState<number>(3);
  const [page, setPage] = useState<number>(2);
  const [orderByField, setOrderByField] = useState<string>('stock');
  const [orderByDirection, setOrderByDirection] = useState<'ASC' | 'DESC'>('ASC');

  // Datos de GET /joyas (HATEOAS)
  const [hateoasResponse, setHateoasResponse] = useState<HateoasResponse | null>(null);
  const [joyasLoaded, setJoyasLoaded] = useState<Record<string, JoyaItem>>({});
  const [selectedJoya, setSelectedJoya] = useState<JoyaItem | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState<boolean>(false);
  const [catalogUrl, setCatalogUrl] = useState<string>('');

  // Estados de control para /joyas/filtros
  const [precioMin, setPrecioMin] = useState<string>('25000');
  const [precioMax, setPrecioMax] = useState<string>('30000');
  const [categoria, setCategoria] = useState<string>('aros');
  const [metal, setMetal] = useState<string>('plata');
  const [filteredJoyas, setFilteredJoyas] = useState<JoyaItem[]>([]);
  const [loadingFiltros, setLoadingFiltros] = useState<boolean>(false);
  const [filtrosUrl, setFiltrosUrl] = useState<string>('');

  // Explorador REST
  const [apiEndpoint, setApiEndpoint] = useState<string>('/joyas?limits=3&page=2&order_by=stock_ASC');
  const [apiResponse, setApiResponse] = useState<unknown>(null);
  const [apiStatus, setApiStatus] = useState<number | null>(null);
  const [apiTime, setApiTime] = useState<number | null>(null);
  const [apiLoading, setApiLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Modal para detalle individual
  const [modalOpen, setModalOpen] = useState<boolean>(false);

  // Carga inicial
  useEffect(() => {
    fetchCatalogo(3, 2, 'stock', 'ASC');
    fetchFiltros('25000', '30000', 'aros', 'plata');
  }, []);

  // Función 1: GET /joyas con límites, paginación, orden y respuesta HATEOAS
  const fetchCatalogo = async (
    lim: number = limits,
    pg: number = page,
    field: string = orderByField,
    dir: 'ASC' | 'DESC' = orderByDirection
  ) => {
    setLoadingCatalog(true);
    const url = `/joyas?limits=${lim}&page=${pg}&order_by=${field}_${dir}`;
    setCatalogUrl(url);

    try {
      const res = await fetch(url);
      const data: HateoasResponse = await res.json();
      setHateoasResponse(data);

      // Cargar en paralelo los datos de las joyas para mostrarlas con sus imágenes
      if (data.results && data.results.length > 0) {
        const itemsMap: Record<string, JoyaItem> = {};
        await Promise.all(
          data.results.map(async (item) => {
            try {
              const itemRes = await fetch(item.href);
              if (itemRes.ok) {
                const joyaItem: JoyaItem = await itemRes.json();
                itemsMap[item.href] = joyaItem;
              }
            } catch {
              // Silencioso
            }
          })
        );
        setJoyasLoaded(itemsMap);
      }
    } catch (err) {
      console.error('Error al consultar catálogo:', err);
    } finally {
      setLoadingCatalog(false);
    }
  };

  // Función 2: Cargar recurso individual por su enlace HATEOAS
  const handleOpenJoyaHref = async (href: string) => {
    try {
      const res = await fetch(href);
      if (res.ok) {
        const item: JoyaItem = await res.json();
        setSelectedJoya(item);
        setModalOpen(true);
      }
    } catch (err) {
      console.error('Error al abrir recurso HATEOAS:', err);
    }
  };

  // Función 3: GET /joyas/filtros
  const fetchFiltros = async (
    pMin: string = precioMin,
    pMax: string = precioMax,
    cat: string = categoria,
    met: string = metal
  ) => {
    setLoadingFiltros(true);
    const params = new URLSearchParams();
    if (pMin.trim()) params.append('precio_min', pMin.trim());
    if (pMax.trim()) params.append('precio_max', pMax.trim());
    if (cat.trim()) params.append('categoria', cat.trim());
    if (met.trim()) params.append('metal', met.trim());

    const url = `/joyas/filtros?${params.toString()}`;
    setFiltrosUrl(url);

    try {
      const res = await fetch(url);
      const data = await res.json();
      setFilteredJoyas(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error al consultar filtros:', err);
    } finally {
      setLoadingFiltros(false);
    }
  };

  // Función 4: Ejecutar petición en explorador REST
  const executeApiQuery = async (urlToRun?: string) => {
    const target = urlToRun || apiEndpoint;
    setApiLoading(true);
    const start = performance.now();
    try {
      const res = await fetch(target);
      const elapsed = Math.round(performance.now() - start);
      setApiStatus(res.status);
      setApiTime(elapsed);
      const data = await res.json();
      setApiResponse(data);
    } catch (err: unknown) {
      const elapsed = Math.round(performance.now() - start);
      setApiStatus(500);
      setApiTime(elapsed);
      setApiResponse({
        error: 'Error al contactar API',
        detalle: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setApiLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0c0a09] text-[#f5f5f4] flex flex-col selection:bg-amber-500/30 selection:text-amber-200">
      {/* CABECERA EDITORIAL DE ALTA JOYERÍA */}
      <header className="border-b border-amber-950/30 bg-[#12100e]/95 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-5 flex flex-wrap items-center justify-between gap-6">
            {/* Logotipo y Título de Marca */}
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full border border-amber-500/40 bg-gradient-to-b from-[#26211c] to-[#12100e] flex items-center justify-center text-amber-300 shadow-inner">
                <Gem className="h-5 w-5" />
              </div>
              <div>
                <span className="block text-[10px] tracking-[0.25em] uppercase text-amber-400/90 font-medium">
                  Atelier de Joyería Fina
                </span>
                <h1 className="text-2xl sm:text-3xl font-serif tracking-tight text-[#faf8f5] leading-none">
                  My Precious Spa
                </h1>
              </div>
            </div>

            {/* Navegación Principal */}
            <nav className="flex items-center gap-1 bg-[#1a1714] p-1 rounded-xl border border-stone-800">
              <button
                onClick={() => setActiveTab('catalogo')}
                className={`px-4 py-2 rounded-lg text-xs tracking-wide transition-all ${
                  activeTab === 'catalogo'
                    ? 'bg-[#29241f] text-amber-300 font-medium shadow-sm border border-amber-900/40'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-[#201c18]'
                }`}
              >
                Catálogo Paginado & HATEOAS
              </button>

              <button
                onClick={() => setActiveTab('filtros')}
                className={`px-4 py-2 rounded-lg text-xs tracking-wide transition-all ${
                  activeTab === 'filtros'
                    ? 'bg-[#29241f] text-amber-300 font-medium shadow-sm border border-amber-900/40'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-[#201c18]'
                }`}
              >
                Filtro de Joyas
              </button>

              <button
                onClick={() => {
                  setActiveTab('api');
                  if (!apiResponse) executeApiQuery();
                }}
                className={`px-4 py-2 rounded-lg text-xs tracking-wide transition-all ${
                  activeTab === 'api'
                    ? 'bg-[#29241f] text-amber-300 font-medium shadow-sm border border-amber-900/40'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-[#201c18]'
                }`}
              >
                Explorador REST
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ==================================================================== */}
        {/* VISTA 1: CATÁLOGO CON HATEOAS, LÍMITE, PÁGINA Y ORDENAMIENTO */}
        {/* ==================================================================== */}
        {activeTab === 'catalogo' && (
          <div className="space-y-8">
            {/* Banner de Presentación */}
            <div className="relative rounded-2xl overflow-hidden border border-amber-950/40 bg-[#161310] min-h-[160px] flex items-center p-6 sm:p-8">
              <div
                className="absolute inset-0 bg-cover bg-center opacity-25 mix-blend-luminosity filter blur-[1px]"
                style={{
                  backgroundImage: `url('https://images.unsplash.com/photo-1531995811006-35cb42e1a022?auto=format&fit=crop&w=1600&q=80')`
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0c0a09] via-[#0c0a09]/90 to-transparent" />

              <div className="relative z-10 max-w-2xl space-y-2">
                <span className="text-[11px] uppercase tracking-[0.2em] text-amber-300/80 font-medium">
                  Colección Permanente
                </span>
                <h2 className="text-2xl sm:text-3xl font-serif text-[#faf8f5] tracking-tight">
                  Inventario Exclusivo &amp; Navegación HATEOAS
                </h2>
                <p className="text-xs sm:text-sm text-stone-300 font-light leading-relaxed">
                  Controla la cantidad de piezas visibles mediante límites y páginas computadas, ordena por stock o precio, y navega directamente hacia cada joya a través de sus hiperenlaces de recurso.
                </p>
              </div>
            </div>

            {/* Barra de Controles: Límite, Paginación y Orden */}
            <div className="p-5 rounded-2xl bg-[#141210] border border-stone-800 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-800/80 pb-4">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-amber-400" />
                  <span className="text-xs uppercase tracking-wider font-semibold text-stone-300">
                    Parámetros de Consulta (GET /joyas)
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono text-stone-400">
                  <span>URL:</span>
                  <code className="px-2.5 py-1 rounded bg-[#0c0a09] border border-stone-800 text-amber-300">
                    {catalogUrl || '/joyas?limits=3&page=2&order_by=stock_ASC'}
                  </code>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                {/* Límite de recursos */}
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-stone-400 mb-1.5 font-medium">
                    1. Límite de recursos (limits)
                  </label>
                  <select
                    value={limits}
                    onChange={(e) => {
                      const newLimits = parseInt(e.target.value, 10);
                      setLimits(newLimits);
                      fetchCatalogo(newLimits, page, orderByField, orderByDirection);
                    }}
                    className="w-full bg-[#0c0a09] border border-stone-700/80 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-400"
                  >
                    <option value={2}>2 joyas por página</option>
                    <option value={3}>3 joyas por página (Ejemplo oficial)</option>
                    <option value={4}>4 joyas por página</option>
                    <option value={6}>6 joyas por página (Todas)</option>
                  </select>
                </div>

                {/* Paginación */}
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-stone-400 mb-1.5 font-medium">
                    3. Paginación (page)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const newPage = Math.max(1, page - 1);
                        setPage(newPage);
                        fetchCatalogo(limits, newPage, orderByField, orderByDirection);
                      }}
                      disabled={page <= 1}
                      className="p-2 rounded-xl bg-[#0c0a09] border border-stone-700/80 hover:bg-[#1a1714] text-stone-300 disabled:opacity-30 disabled:cursor-not-allowed transition"
                      title="Página anterior"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <div className="flex-1 bg-[#0c0a09] border border-stone-700/80 rounded-xl py-2 px-3 text-center text-xs font-semibold text-amber-200 font-mono">
                      Página {page}
                    </div>
                    <button
                      onClick={() => {
                        const newPage = page + 1;
                        setPage(newPage);
                        fetchCatalogo(limits, newPage, orderByField, orderByDirection);
                      }}
                      className="p-2 rounded-xl bg-[#0c0a09] border border-stone-700/80 hover:bg-[#1a1714] text-stone-300 transition"
                      title="Página siguiente"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Ordenamiento */}
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-stone-400 mb-1.5 font-medium">
                    4. Ordenamiento (order_by)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={orderByField}
                      onChange={(e) => {
                        const newField = e.target.value;
                        setOrderByField(newField);
                        fetchCatalogo(limits, page, newField, orderByDirection);
                      }}
                      className="bg-[#0c0a09] border border-stone-700/80 rounded-xl px-2.5 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-400"
                    >
                      <option value="stock">stock</option>
                      <option value="precio">precio</option>
                      <option value="nombre">nombre</option>
                      <option value="id">id</option>
                    </select>
                    <select
                      value={orderByDirection}
                      onChange={(e) => {
                        const newDir = e.target.value as 'ASC' | 'DESC';
                        setOrderByDirection(newDir);
                        fetchCatalogo(limits, page, orderByField, newDir);
                      }}
                      className="bg-[#0c0a09] border border-stone-700/80 rounded-xl px-2.5 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-400"
                    >
                      <option value="ASC">ASC (Menor a Mayor)</option>
                      <option value="DESC">DESC (Mayor a Menor)</option>
                    </select>
                  </div>
                </div>

                {/* Botón de recarga */}
                <div>
                  <button
                    onClick={() => fetchCatalogo()}
                    disabled={loadingCatalog}
                    className="w-full py-2.5 px-4 rounded-xl bg-amber-500/90 hover:bg-amber-400 text-stone-950 font-semibold text-xs transition flex items-center justify-center gap-2 shadow-md shadow-amber-500/10 disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${loadingCatalog ? 'animate-spin' : ''}`} />
                    Actualizar Catálogo
                  </button>
                </div>
              </div>

              {/* Resumen HATEOAS devuelto */}
              {hateoasResponse && (
                <div className="pt-3 border-t border-stone-800/60 flex flex-wrap items-center justify-between text-xs text-stone-400 gap-3">
                  <div className="flex items-center gap-3">
                    <span>
                      Total de piezas en esta página: <strong className="text-amber-300 font-mono">{hateoasResponse.totalJoyas}</strong>
                    </span>
                    <span className="opacity-30">/</span>
                    <span>
                      Stock total sumado: <strong className="text-amber-300 font-mono">{hateoasResponse.stockTotal} unidades</strong>
                    </span>
                  </div>

                  <div className="text-[11px] text-stone-400 font-light italic">
                    Estructura HATEOAS con enlaces semánticos a cada recurso individual
                  </div>
                </div>
              )}
            </div>

            {/* Grid de Productos con Imágenes Reales de Joyería */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-serif text-[#faf8f5]">
                  Piezas en Exhibición ({hateoasResponse?.results?.length || 0})
                </h3>
              </div>

              {loadingCatalog ? (
                <div className="py-20 text-center text-stone-400 space-y-3">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto text-amber-400" />
                  <p className="text-xs">Cargando joyas desde la base de datos...</p>
                </div>
              ) : hateoasResponse?.results && hateoasResponse.results.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {hateoasResponse.results.map((result, idx) => {
                    const joyaItem = joyasLoaded[result.href];
                    const idMatch = result.href.match(/\/(\d+)$/);
                    const joyaId = idMatch ? parseInt(idMatch[1], 10) : idx + 1;
                    const fotoInfo = JOYAS_FOTOS[joyaId] || {
                      img: FOTO_DEFAULT,
                      desc: 'Pieza fina de colección.',
                      detalle: 'Acabado en metales preciosos.'
                    };

                    return (
                      <div
                        key={idx}
                        className="group bg-[#141210] rounded-2xl border border-stone-800/80 overflow-hidden hover:border-amber-700/50 transition-all duration-300 flex flex-col justify-between shadow-sm"
                      >
                        {/* Imagen con zoom y badge fotográfico */}
                        <div className="relative aspect-[4/3] bg-[#0c0a09] overflow-hidden">
                          <img
                            src={fotoInfo.img}
                            alt={result.name}
                            loading="lazy"
                            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#141210] via-transparent to-transparent opacity-80" />

                          {joyaItem && (
                            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs">
                              <span className="font-mono text-amber-300 font-bold text-sm bg-[#0c0a09]/80 backdrop-blur px-2.5 py-1 rounded-lg border border-amber-900/30">
                                ${joyaItem.precio.toLocaleString('es-CL')}
                              </span>
                              <span className="text-[11px] text-stone-300 bg-[#0c0a09]/80 backdrop-blur px-2 py-0.5 rounded border border-stone-800">
                                Stock: {joyaItem.stock} u.
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Metadatos y Enlace HATEOAS */}
                        <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                          <div className="space-y-1.5">
                            {joyaItem && (
                              <div className="text-[11px] uppercase tracking-wider text-amber-400/90 font-medium flex items-center gap-1.5">
                                <span>{joyaItem.categoria}</span>
                                <span className="opacity-40">·</span>
                                <span>{joyaItem.metal}</span>
                              </div>
                            )}

                            <h4 className="text-base font-serif font-medium text-white group-hover:text-amber-200 transition-colors">
                              {result.name}
                            </h4>

                            <p className="text-xs text-stone-400 font-light line-clamp-2">
                              {fotoInfo.desc}
                            </p>
                          </div>

                          {/* Enlace semántico HATEOAS */}
                          <div className="pt-3 border-t border-stone-800/80 space-y-2">
                            <div className="flex items-center justify-between text-[11px] font-mono text-stone-400">
                              <span>HATEOAS href:</span>
                              <code className="text-amber-300">{result.href}</code>
                            </div>

                            <button
                              onClick={() => handleOpenJoyaHref(result.href)}
                              className="w-full py-2 px-3 rounded-xl bg-[#1c1815] hover:bg-[#26211d] text-amber-300 border border-stone-700/80 text-xs font-medium transition flex items-center justify-center gap-1.5"
                            >
                              <span>Consultar Recurso</span>
                              <ExternalLink className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-12 text-center bg-[#141210] border border-stone-800 rounded-2xl text-stone-400 text-xs">
                  No se encontraron joyas en esta página o combinación de parámetros.
                </div>
              )}
            </div>

            {/* Inspección de la estructura HATEOAS completa */}
            <div className="p-5 rounded-2xl bg-[#141210] border border-stone-800 space-y-3">
              <div className="flex items-center justify-between border-b border-stone-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-amber-400" />
                  <span className="text-xs uppercase tracking-wider font-semibold text-stone-300">
                    Estructura JSON HATEOAS Devuelta por GET /joyas
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(JSON.stringify(hateoasResponse, null, 2))}
                  className="text-xs text-stone-400 hover:text-stone-200 flex items-center gap-1.5"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  Copiar JSON
                </button>
              </div>

              <pre className="p-3.5 rounded-xl bg-[#0c0a09] border border-stone-900 font-mono text-xs text-amber-300/90 overflow-x-auto max-h-48">
                {JSON.stringify(hateoasResponse, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* VISTA 2: FILTRO DE RECURSOS POR CAMPOS (GET /joyas/filtros) */}
        {/* ==================================================================== */}
        {activeTab === 'filtros' && (
          <div className="space-y-8">
            {/* Banner de Filtros */}
            <div className="relative rounded-2xl overflow-hidden border border-amber-950/40 bg-[#161310] min-h-[140px] flex items-center p-6 sm:p-8">
              <div
                className="absolute inset-0 bg-cover bg-center opacity-20 mix-blend-luminosity filter blur-[1px]"
                style={{
                  backgroundImage: `url('https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1600&q=80')`
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0c0a09] via-[#0c0a09]/90 to-transparent" />

              <div className="relative z-10 max-w-2xl space-y-1.5">
                <span className="text-[11px] uppercase tracking-[0.2em] text-amber-300/80 font-medium">
                  Búsqueda Precisa
                </span>
                <h2 className="text-2xl sm:text-3xl font-serif text-[#faf8f5] tracking-tight">
                  Filtro Parametrizado de Recursos (GET /joyas/filtros)
                </h2>
                <p className="text-xs sm:text-sm text-stone-300 font-light leading-relaxed">
                  Filtra por precio mínimo, precio máximo, categoría y tipo de metal mediante sentencias preparadas contra SQL Injection.
                </p>
              </div>
            </div>

            {/* Controles de Filtro */}
            <div className="p-5 rounded-2xl bg-[#141210] border border-stone-800 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-800/80 pb-3">
                <span className="text-xs uppercase tracking-wider font-semibold text-stone-300">
                  Criterios de Filtrado
                </span>

                <div className="flex items-center gap-2 text-xs font-mono text-stone-400">
                  <span>URL:</span>
                  <code className="px-2.5 py-1 rounded bg-[#0c0a09] border border-stone-800 text-emerald-300">
                    {filtrosUrl || '/joyas/filtros?precio_min=25000&precio_max=30000&categoria=aros&metal=plata'}
                  </code>
                </div>
              </div>

              {/* Botones de presets */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] uppercase tracking-wider text-stone-400 font-medium mr-1">
                  Atajos:
                </span>
                <button
                  onClick={() => {
                    setPrecioMin('25000');
                    setPrecioMax('30000');
                    setCategoria('aros');
                    setMetal('plata');
                    fetchFiltros('25000', '30000', 'aros', 'plata');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#201c18] hover:bg-[#2c2621] text-amber-300 border border-amber-900/40 text-xs transition"
                >
                  Aros de Plata ($25.000 - $30.000)
                </button>
                <button
                  onClick={() => {
                    setPrecioMin('');
                    setPrecioMax('');
                    setCategoria('');
                    setMetal('oro');
                    fetchFiltros('', '', '', 'oro');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#181614] hover:bg-[#201c18] text-stone-300 border border-stone-800 text-xs transition"
                >
                  Solo Oro
                </button>
                <button
                  onClick={() => {
                    setPrecioMin('');
                    setPrecioMax('');
                    setCategoria('collar');
                    setMetal('');
                    fetchFiltros('', '', 'collar', '');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#181614] hover:bg-[#201c18] text-stone-300 border border-stone-800 text-xs transition"
                >
                  Collares
                </button>
                <button
                  onClick={() => {
                    setPrecioMin('');
                    setPrecioMax('');
                    setCategoria('anillo');
                    setMetal('');
                    fetchFiltros('', '', 'anillo', '');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#181614] hover:bg-[#201c18] text-stone-300 border border-stone-800 text-xs transition"
                >
                  Anillos
                </button>
                <button
                  onClick={() => {
                    setPrecioMin('');
                    setPrecioMax('');
                    setCategoria('');
                    setMetal('');
                    fetchFiltros('', '', '', '');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#181614] hover:bg-[#201c18] text-stone-400 border border-stone-800 text-xs transition"
                >
                  Limpiar Filtros
                </button>
              </div>

              {/* Formulario de los 4 campos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2 items-end">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-stone-400 mb-1 font-medium">
                    precio_min:
                  </label>
                  <input
                    type="number"
                    placeholder="Ej: 20000"
                    value={precioMin}
                    onChange={(e) => setPrecioMin(e.target.value)}
                    className="w-full bg-[#0c0a09] border border-stone-700/80 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-stone-400 mb-1 font-medium">
                    precio_max:
                  </label>
                  <input
                    type="number"
                    placeholder="Ej: 30000"
                    value={precioMax}
                    onChange={(e) => setPrecioMax(e.target.value)}
                    className="w-full bg-[#0c0a09] border border-stone-700/80 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-stone-400 mb-1 font-medium">
                    categoria:
                  </label>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    className="w-full bg-[#0c0a09] border border-stone-700/80 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-400"
                  >
                    <option value="">Todas las categorías</option>
                    <option value="collar">collar</option>
                    <option value="aros">aros</option>
                    <option value="anillo">anillo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-stone-400 mb-1 font-medium">
                    metal:
                  </label>
                  <select
                    value={metal}
                    onChange={(e) => setMetal(e.target.value)}
                    className="w-full bg-[#0c0a09] border border-stone-700/80 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-400"
                  >
                    <option value="">Todos los metales</option>
                    <option value="oro">oro</option>
                    <option value="plata">plata</option>
                  </select>
                </div>

                <div>
                  <button
                    onClick={() => fetchFiltros()}
                    disabled={loadingFiltros}
                    className="w-full py-2.5 px-4 rounded-xl bg-amber-500/90 hover:bg-amber-400 text-stone-950 font-semibold text-xs transition flex items-center justify-center gap-2 shadow-md shadow-amber-500/10"
                  >
                    <Search className={`h-3.5 w-3.5 ${loadingFiltros ? 'animate-spin' : ''}`} />
                    Aplicar Filtros
                  </button>
                </div>
              </div>
            </div>

            {/* Galería de Resultados Filtrados */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-serif text-[#faf8f5]">
                  Joyas Coincidentes ({filteredJoyas.length})
                </h3>
              </div>

              {loadingFiltros ? (
                <div className="py-20 text-center text-stone-400 space-y-3">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto text-amber-400" />
                  <p className="text-xs">Buscando joyas...</p>
                </div>
              ) : filteredJoyas.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredJoyas.map((joya) => {
                    const fotoInfo = JOYAS_FOTOS[joya.id] || {
                      img: FOTO_DEFAULT,
                      desc: 'Pieza fina de colección.',
                      detalle: 'Acabado en metales preciosos.'
                    };

                    return (
                      <div
                        key={joya.id}
                        className="group bg-[#141210] rounded-2xl border border-stone-800/80 overflow-hidden hover:border-amber-700/50 transition-all duration-300 flex flex-col justify-between shadow-sm"
                      >
                        <div className="relative aspect-[4/3] bg-[#0c0a09] overflow-hidden">
                          <img
                            src={fotoInfo.img}
                            alt={joya.nombre}
                            loading="lazy"
                            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#141210] via-transparent to-transparent opacity-80" />

                          <div className="absolute top-3 right-3">
                            <span className="text-[10px] tracking-wider uppercase font-semibold px-2 py-0.5 rounded bg-[#0c0a09]/80 backdrop-blur border border-stone-800 text-stone-200">
                              {joya.metal}
                            </span>
                          </div>

                          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs">
                            <span className="font-mono text-emerald-400 font-bold text-sm bg-[#0c0a09]/80 backdrop-blur px-2.5 py-1 rounded-lg border border-emerald-950/40">
                              ${joya.precio.toLocaleString('es-CL')}
                            </span>
                            <span className="text-[11px] text-stone-300 bg-[#0c0a09]/80 backdrop-blur px-2 py-0.5 rounded border border-stone-800">
                              Stock: {joya.stock} u.
                            </span>
                          </div>
                        </div>

                        <div className="p-5 space-y-2">
                          <div className="text-[11px] uppercase tracking-wider text-amber-400/90 font-medium">
                            Categoría: {joya.categoria}
                          </div>
                          <h4 className="text-base font-serif font-medium text-white">
                            {joya.nombre}
                          </h4>
                          <p className="text-xs text-stone-400 font-light line-clamp-2">
                            {fotoInfo.desc}
                          </p>

                          <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between text-[11px] text-stone-500">
                            <span>ID de catálogo: #{joya.id}</span>
                            <button
                              onClick={() => handleOpenJoyaHref(`/joyas/joya/${joya.id}`)}
                              className="text-amber-300 hover:text-amber-200 font-medium flex items-center gap-1"
                            >
                              Ver Ficha <ExternalLink className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-12 text-center bg-[#141210] border border-stone-800 rounded-2xl text-stone-400 text-xs">
                  No se encontraron joyas que cumplan con los filtros especificados.
                </div>
              )}

              {/* JSON de la respuesta de filtros */}
              <div className="p-5 rounded-2xl bg-[#141210] border border-stone-800 space-y-3">
                <div className="flex items-center justify-between border-b border-stone-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs uppercase tracking-wider font-semibold text-stone-300">
                      Respuesta JSON de GET /joyas/filtros
                    </span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(filteredJoyas, null, 2))}
                    className="text-xs text-stone-400 hover:text-stone-200 flex items-center gap-1.5"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    Copiar JSON
                  </button>
                </div>

                <pre className="p-3.5 rounded-xl bg-[#0c0a09] border border-stone-900 font-mono text-xs text-emerald-300/90 overflow-x-auto max-h-48">
                  {JSON.stringify(filteredJoyas, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* VISTA 3: EXPLORADOR DE API REST */}
        {/* ==================================================================== */}
        {activeTab === 'api' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-[#141210] border border-stone-800 space-y-5">
              <div className="border-b border-stone-800/80 pb-4">
                <h2 className="text-xl font-serif text-[#faf8f5] flex items-center gap-2">
                  <Terminal className="h-5 w-5 text-amber-400" />
                  Consola de Peticiones REST
                </h2>
                <p className="text-xs text-stone-400 mt-1">
                  Envía solicitudes HTTP directas hacia el servidor backend Express montado en el puerto 3000
                </p>
              </div>

              {/* Botones de consulta rápida */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    const u = '/joyas?limits=3&page=2&order_by=stock_ASC';
                    setApiEndpoint(u);
                    executeApiQuery(u);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#1a1714] hover:bg-[#26211d] text-xs font-mono text-amber-200 border border-amber-900/40 transition"
                >
                  GET /joyas?limits=3&amp;page=2&amp;order_by=stock_ASC
                </button>
                <button
                  onClick={() => {
                    const u = '/joyas/filtros?precio_min=25000&precio_max=30000&categoria=aros&metal=plata';
                    setApiEndpoint(u);
                    executeApiQuery(u);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#1a1714] hover:bg-[#26211d] text-xs font-mono text-emerald-300 border border-emerald-950/50 transition"
                >
                  GET /joyas/filtros?precio_min=25000&amp;precio_max=30000&amp;...
                </button>
                <button
                  onClick={() => {
                    const u = '/joyas/joya/5';
                    setApiEndpoint(u);
                    executeApiQuery(u);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#1a1714] hover:bg-[#26211d] text-xs font-mono text-stone-300 border border-stone-800 transition"
                >
                  GET /joyas/joya/5
                </button>
                <button
                  onClick={() => {
                    const u = '/joyas?limits=invalido';
                    setApiEndpoint(u);
                    executeApiQuery(u);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#1a1714] hover:bg-[#26211d] text-xs font-mono text-rose-300 border border-rose-950/40 transition"
                >
                  GET /joyas?limits=invalido (Error 400)
                </button>
              </div>

              {/* Barra de envío */}
              <div className="flex items-center gap-2">
                <span className="px-3 py-2 rounded-xl bg-[#0c0a09] border border-stone-800 font-mono font-bold text-xs text-emerald-400">
                  GET
                </span>
                <input
                  type="text"
                  value={apiEndpoint}
                  onChange={(e) => setApiEndpoint(e.target.value)}
                  className="flex-1 bg-[#0c0a09] border border-stone-800 rounded-xl px-4 py-2 font-mono text-xs text-white focus:outline-none focus:border-amber-400"
                  placeholder="/joyas..."
                />
                <button
                  onClick={() => executeApiQuery()}
                  disabled={apiLoading}
                  className="px-5 py-2 rounded-xl bg-amber-500/90 hover:bg-amber-400 text-stone-950 font-bold text-xs transition flex items-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${apiLoading ? 'animate-spin' : ''}`} />
                  Enviar
                </button>
              </div>

              {/* Visor de Respuesta */}
              <div className="bg-[#0c0a09] border border-stone-900 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-stone-800/80 pb-2.5">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-stone-400">Estado:</span>
                    {apiStatus && (
                      <span
                        className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                          apiStatus < 400
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                            : 'bg-rose-950/60 text-rose-400 border border-rose-800/40'
                        }`}
                      >
                        {apiStatus} {apiStatus === 200 ? 'OK' : apiStatus === 400 ? 'Bad Request' : 'Error'}
                      </span>
                    )}
                    {apiTime !== null && (
                      <span className="text-stone-500 font-mono">({apiTime}ms)</span>
                    )}
                  </div>

                  <button
                    onClick={() => copyToClipboard(JSON.stringify(apiResponse, null, 2))}
                    className="text-xs text-stone-400 hover:text-stone-200 flex items-center gap-1"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    Copiar
                  </button>
                </div>

                <pre className="font-mono text-xs text-emerald-300/90 overflow-x-auto max-h-[360px]">
                  {apiResponse ? JSON.stringify(apiResponse, null, 2) : 'Presiona "Enviar" para ejecutar la consulta...'}
                </pre>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL EDITORIAL PARA RECURSO HATEOAS INDIVIDUAL */}
      {modalOpen && selectedJoya && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-[#141210] rounded-3xl border border-amber-900/40 overflow-hidden shadow-2xl space-y-0">
            {/* Cabecera del modal */}
            <div className="relative aspect-[16/10] bg-[#0c0a09] overflow-hidden">
              <img
                src={(JOYAS_FOTOS[selectedJoya.id] || { img: FOTO_DEFAULT }).img}
                alt={selectedJoya.nombre}
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#141210] via-transparent to-transparent" />

              <button
                onClick={() => setModalOpen(false)}
                className="absolute top-4 right-4 h-9 w-9 rounded-full bg-[#0c0a09]/80 text-stone-300 hover:text-white flex items-center justify-center border border-stone-800 transition"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="absolute bottom-4 left-5 right-5">
                <div className="text-[11px] uppercase tracking-widest text-amber-300/90 font-medium">
                  {selectedJoya.categoria} · {selectedJoya.metal}
                </div>
                <h3 className="text-2xl font-serif text-white tracking-tight">
                  {selectedJoya.nombre}
                </h3>
              </div>
            </div>

            {/* Cuerpo del modal */}
            <div className="p-6 space-y-4">
              <p className="text-xs text-stone-300 font-light leading-relaxed">
                {(JOYAS_FOTOS[selectedJoya.id] || { desc: 'Pieza de joyería fina.' }).desc}
              </p>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-[#0c0a09] border border-stone-800 text-center">
                  <div className="text-[10px] uppercase tracking-wider text-stone-400 mb-0.5">Precio Oficial</div>
                  <div className="text-base font-bold text-emerald-400 font-mono">
                    ${selectedJoya.precio.toLocaleString('es-CL')}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0c0a09] border border-stone-800 text-center">
                  <div className="text-[10px] uppercase tracking-wider text-stone-400 mb-0.5">Stock en Tienda</div>
                  <div className="text-base font-bold text-white font-mono">
                    {selectedJoya.stock} unidades
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#1a1714] border border-stone-800 text-[11px] text-stone-400 flex items-center justify-between font-mono">
                <span>Ruta del Recurso:</span>
                <code className="text-amber-300">/joyas/joya/{selectedJoya.id}</code>
              </div>

              <button
                onClick={() => setModalOpen(false)}
                className="w-full py-2.5 rounded-xl bg-amber-500/90 hover:bg-amber-400 text-stone-950 font-semibold text-xs transition"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="border-t border-stone-800/80 bg-[#0e0c0b] py-6 text-center text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Gem className="h-4 w-4 text-amber-500/60" />
            <span className="font-serif text-stone-400">My Precious Spa — Tienda de Joyas</span>
          </div>
          <span className="text-[11px] text-stone-500">
            HATEOAS · Límites · Paginación · Ordenamiento · Filtros Parametrizados
          </span>
        </div>
      </footer>
    </div>
  );
}
