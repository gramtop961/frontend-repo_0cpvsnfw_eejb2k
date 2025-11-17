import { useEffect, useMemo, useState } from 'react'

// Resolve backend URL: env first, then auto-detect in preview, then localhost
const API_BASE = import.meta.env.VITE_BACKEND_URL || (
  typeof window !== 'undefined' && window.location.hostname.includes('modal.host')
    ? 'https://ta-01ka9an0nydq7b0vtfk2v6nfzp-8000.wo-yxk9w2iajh1zhifmhjppf6di0.w.modal.host'
    : 'http://localhost:8000'
)

function CurrencyToggle({ currency, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`px-2 py-1 rounded ${currency==='USD'?'bg-white/10 text-white':'text-gray-400'}`}>USD</span>
      <label className="inline-flex items-center cursor-pointer">
        <input type="checkbox" className="sr-only peer" checked={currency==='EUR'} onChange={e=>onChange(e.target.checked?'EUR':'USD')} />
        <div className="w-12 h-6 bg-gray-700 peer-checked:bg-indigo-600 rounded-full relative transition">
          <div className={`absolute top-0.5 ${currency==='EUR'?'right-0.5':'left-0.5'} w-5 h-5 bg-white rounded-full transition`}></div>
        </div>
      </label>
      <span className={`px-2 py-1 rounded ${currency==='EUR'?'bg-white/10 text-white':'text-gray-400'}`}>EUR</span>
    </div>
  )
}

function SearchBar({ onResults }) {
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const search = async () => {
    if (!q.trim()) return
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API_BASE}/api/search/cardmarket?q=${encodeURIComponent(q)}`)
      if (!res.ok) throw new Error('Search failed')
      const data = await res.json()
      onResults(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex gap-2 w-full">
      <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search by name or ID (e.g., OP05-119)" className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-gray-200 placeholder-gray-500" />
      <button onClick={search} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 rounded">Search</button>
      {loading && <span className="text-gray-400">Loading...</span>}
      {error && <span className="text-red-400">{error}</span>}
    </div>
  )
}

function ResultsGrid({ items, onAdd }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-4">
      {items.map((it, i)=> (
        <div key={i} className="bg-gray-900 border border-gray-800 rounded p-2">
          <div className="aspect-[3/4] bg-black/50 rounded overflow-hidden flex items-center justify-center">
            {it.image_url ? (
              <img src={it.image_url} alt={it.name||it.id_code} className="w-full h-full object-contain" />
            ) : (
              <div className="text-gray-600 text-sm">No image</div>
            )}
          </div>
          <div className="mt-2">
            <div className="text-gray-100 text-sm truncate" title={it.name}>{it.name || 'Unknown'}</div>
            <div className="text-gray-500 text-xs">{it.id_code || '—'} · {it.language || '—'}</div>
          </div>
          <AddToCollectionButton item={it} onAdd={onAdd} />
        </div>
      ))}
    </div>
  )
}

function AddToCollectionButton({ item, onAdd }) {
  const [price, setPrice] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [qty, setQty] = useState(1)
  const [saving, setSaving] = useState(false)
  const add = async () => {
    if (!price) return
    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/api/collection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_code: item.id_code,
          name: item.name,
          language: item.language,
          image_url: item.image_url,
          source_url: item.source_url,
          source: 'cardmarket',
          quantity: qty,
          purchase_price: parseFloat(price),
          purchase_currency: currency,
        })
      })
      if (!res.ok) throw new Error('Save failed')
      const data = await res.json()
      onAdd && onAdd(data._id)
      setPrice(''); setQty(1)
    } catch (e) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }
  return (
    <div className="mt-2 flex items-center gap-2">
      <input value={price} onChange={e=>setPrice(e.target.value)} placeholder="Buy price" className="flex-1 bg-gray-950 border border-gray-800 rounded px-2 py-1 text-gray-200 text-sm" />
      <select value={currency} onChange={e=>setCurrency(e.target.value)} className="bg-gray-900 border border-gray-700 text-gray-200 text-sm rounded px-2 py-1">
        <option>USD</option>
        <option>EUR</option>
      </select>
      <input type="number" min={1} value={qty} onChange={e=>setQty(parseInt(e.target.value||'1'))} className="w-16 bg-gray-950 border border-gray-800 rounded px-2 py-1 text-gray-200 text-sm" />
      <button onClick={add} disabled={saving} className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-3 py-1 rounded">{saving?'Saving...':'Add'}</button>
    </div>
  )
}

function CollectionList() {
  const [items, setItems] = useState([])
  const [tab, setTab] = useState('collection')
  const [currency, setCurrency] = useState('USD')
  const [rate, setRate] = useState(1)

  useEffect(()=>{
    fetch(`${API_BASE}/api/collection`).then(r=>r.json()).then(setItems).catch(()=>setItems([]))
  }, [])

  useEffect(()=>{
    if (currency==='USD') { setRate(1); return }
    fetch(`${API_BASE}/api/rate?from=USD&to=EUR`).then(r=>r.json()).then(d=>setRate(d.rate || 1)).catch(()=>setRate(1))
  }, [currency])

  const totalCost = useMemo(()=> items.reduce((s, it)=> s + (it.purchase_price||0) * (it.quantity||1), 0), [items])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2 text-sm">
          <button className={`px-3 py-1 rounded ${tab==='collection'?'bg-indigo-600 text-white':'bg-gray-800 text-gray-300'}`} onClick={()=>setTab('collection')}>Collection</button>
          <button className={`px-3 py-1 rounded ${tab==='market'?'bg-indigo-600 text-white':'bg-gray-800 text-gray-300'}`} onClick={()=>setTab('market')}>Market Watch</button>
          <button className={`px-3 py-1 rounded ${tab==='trending'?'bg-indigo-600 text-white':'bg-gray-800 text-gray-300'}`} onClick={()=>setTab('trending')}>Trendings</button>
        </div>
        <CurrencyToggle currency={currency} onChange={setCurrency} />
      </div>

      {tab==='collection' && (
        <div>
          <div className="bg-gray-900 border border-gray-800 rounded p-4 text-gray-300">
            <div className="text-sm mb-2">Total spent</div>
            <div className="text-2xl font-semibold">{currency==='USD'?'$':'€'}{(totalCost * (currency==='USD'?1:rate)).toFixed(2)}</div>
          </div>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {items.map((it)=> (
              <div key={it._id} className="bg-gray-900 border border-gray-800 rounded p-2">
                <div className="aspect-[3/4] bg-black/50 rounded overflow-hidden flex items-center justify-center">
                  <img src={it.custom_image_url || it.image_url} alt={it.name} className="w-full h-full object-contain" />
                </div>
                <div className="mt-2 text-gray-100 text-sm truncate" title={it.name}>{it.name || it.id_code}</div>
                <div className="text-xs text-gray-500">{it.id_code || '—'} · {it.language || '—'}</div>
                <UploadCustomImage entryId={it._id} onUploaded={(url)=>{
                  setItems(prev=> prev.map(p=> p._id===it._id? {...p, custom_image_url: url}: p))
                }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {tab==='market' && (
        <div className="text-gray-400">Market Watch data will be populated from listing sources. Filters and charts will appear here without fake prices. If a metric is unavailable it will show N/A.</div>
      )}

      {tab==='trending' && (
        <div className="text-gray-400">Trending charts will reflect live data ranges (1w, 1m, 3m, 1y, Max) as available from sources. No fabricated prices will be shown.</div>
      )}
    </div>
  )
}

function UploadCustomImage({ entryId, onUploaded }) {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)

  const upload = async () => {
    if (!file) return
    setLoading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`${API_BASE}/api/collection/${entryId}/image`, { method: 'PUT', body: form })
      if (!res.ok) throw new Error('Upload failed')
      const data = await res.json()
      onUploaded && onUploaded(data.custom_image_url)
      setFile(null)
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="mt-2 flex items-center gap-2">
      <input type="file" accept="image/*" onChange={e=>setFile(e.target.files?.[0]||null)} className="text-xs text-gray-400" />
      <button onClick={upload} disabled={!file || loading} className="bg-gray-800 text-gray-200 text-xs px-2 py-1 rounded">{loading?'Uploading...':'Set image'}</button>
    </div>
  )
}

export default function App() {
  const [results, setResults] = useState([])

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-10 bg-black/80 backdrop-blur border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">OPTCG Collector</h1>
          <nav className="text-sm text-gray-400">Inspired by packmagik · Focused on collectors</nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <section className="bg-gray-950 border border-gray-900 rounded p-4">
          <h2 className="text-lg font-semibold mb-3">Find cards</h2>
          <SearchBar onResults={setResults} />
          <ResultsGrid items={results} onAdd={() => {}} />
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold mb-3">Dashboard</h2>
          <CollectionList />
        </section>
      </main>

      <footer className="border-t border-gray-900/80 py-6 text-center text-gray-500 text-sm">
        Prices and images are fetched from listing sources. No fabricated price data. If unavailable: N/A.
      </footer>
    </div>
  )
}
