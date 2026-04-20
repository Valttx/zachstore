import { useState, useEffect } from 'react';
import { getVentas, getMovimientos, getCambiosStock } from '@/lib/store';
import { Venta, MovimientoCaja, CambioStock } from '@/lib/types';
import { History } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type Tab = 'ventas' | 'movimientos' | 'stock';

export default function HistorialPage() {
  const [tab, setTab] = useState<Tab>('ventas');
  const [filtroFecha, setFiltroFecha] = useState('');
  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [cargando, setCargando] = useState(true);

  // Guardamos los datos en estado local
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoCaja[]>([]);
  const [cambiosStock, setCambiosStock] = useState<CambioStock[]>([]);

  // Al montar, traemos todo desde Supabase en paralelo con Promise.all
  // Esto es más rápido que hacer 3 llamadas una por una
  useEffect(() => {
    Promise.all([getVentas(), getMovimientos(), getCambiosStock()]).then(([v, m, c]) => {
      setVentas(v);
      setMovimientos(m);
      setCambiosStock(c);
      setCargando(false);
    });
  }, []);

  const filtrarFecha = (fecha: string) => {
    if (!filtroFecha) return true;
    return fecha.startsWith(filtroFecha);
  };
  const filtrarUsuario = (usuario: string) => {
    if (!filtroUsuario) return true;
    return usuario.toLowerCase().includes(filtroUsuario.toLowerCase());
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'ventas', label: 'Ventas' },
    { key: 'movimientos', label: 'Movimientos' },
    { key: 'stock', label: 'Cambios de stock' },
  ];

  if (cargando) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Cargando historial...</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="page-header flex items-center gap-2"><History className="h-6 w-6" /> Historial</h2>

      <div className="flex flex-wrap gap-2">
        {tabs.map(t => (
          <Button key={t.key} variant={tab === t.key ? 'default' : 'outline'} size="sm" onClick={() => setTab(t.key)}>{t.label}</Button>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        <Input type="date" value={filtroFecha} onChange={e => setFiltroFecha(e.target.value)} className="w-auto" />
        <Input placeholder="Filtrar por usuario..." value={filtroUsuario} onChange={e => setFiltroUsuario(e.target.value)} className="w-48" />
      </div>

      <div className="pos-card overflow-x-auto">
        {tab === 'ventas' && (
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-muted-foreground">
              <th className="pb-3 font-medium">Fecha</th><th className="pb-3 font-medium">Items</th>
              <th className="pb-3 font-medium">Método</th><th className="pb-3 font-medium text-right">Total</th>
              <th className="pb-3 font-medium">Usuario</th>
            </tr></thead>
            <tbody>
              {ventas.filter(v => filtrarFecha(v.fecha) && filtrarUsuario(v.usuario)).map(v => (
                <tr key={v.id} className="border-b last:border-0">
                  <td className="py-2">{new Date(v.fecha).toLocaleString('es-AR')}</td>
                  <td className="py-2 text-xs">{v.items.map(i => `${i.nombre} x${i.cantidad}`).join(', ')}</td>
                  <td className="py-2 capitalize">{v.metodoPago}</td>
                  <td className="py-2 text-right font-semibold">${v.total.toLocaleString('es-AR')}</td>
                  <td className="py-2">{v.usuario}</td>
                </tr>
              ))}
              {ventas.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Sin ventas registradas</td></tr>}
            </tbody>
          </table>
        )}

        {tab === 'movimientos' && (
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-muted-foreground">
              <th className="pb-3 font-medium">Fecha</th><th className="pb-3 font-medium">Tipo</th>
              <th className="pb-3 font-medium">Concepto</th><th className="pb-3 font-medium text-right">Monto</th>
              <th className="pb-3 font-medium">Usuario</th>
            </tr></thead>
            <tbody>
              {movimientos.filter(m => filtrarFecha(m.fecha) && filtrarUsuario(m.usuario)).map(m => (
                <tr key={m.id} className="border-b last:border-0">
                  <td className="py-2">{new Date(m.fecha).toLocaleString('es-AR')}</td>
                  <td className="py-2"><span className={`text-xs font-medium ${m.tipo === 'ingreso' ? 'text-success' : 'text-destructive'}`}>{m.tipo}</span></td>
                  <td className="py-2">{m.concepto}</td>
                  <td className="py-2 text-right font-semibold">${m.monto.toLocaleString('es-AR')}</td>
                  <td className="py-2">{m.usuario}</td>
                </tr>
              ))}
              {movimientos.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Sin movimientos</td></tr>}
            </tbody>
          </table>
        )}

        {tab === 'stock' && (
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-muted-foreground">
              <th className="pb-3 font-medium">Fecha</th><th className="pb-3 font-medium">Producto</th>
              <th className="pb-3 font-medium">Tipo</th><th className="pb-3 font-medium text-right">Cambio</th>
              <th className="pb-3 font-medium text-right">Stock anterior</th><th className="pb-3 font-medium text-right">Stock nuevo</th>
              <th className="pb-3 font-medium">Usuario</th>
            </tr></thead>
            <tbody>
              {cambiosStock.filter(c => filtrarFecha(c.fecha) && filtrarUsuario(c.usuario)).map(c => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="py-2">{new Date(c.fecha).toLocaleString('es-AR')}</td>
                  <td className="py-2">{c.productoNombre}</td>
                  <td className="py-2 capitalize">{c.tipo}</td>
                  <td className="py-2 text-right font-semibold">{c.cantidad > 0 ? '+' : ''}{c.cantidad}</td>
                  <td className="py-2 text-right">{c.stockAnterior}</td>
                  <td className="py-2 text-right">{c.stockNuevo}</td>
                  <td className="py-2">{c.usuario}</td>
                </tr>
              ))}
              {cambiosStock.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">Sin cambios de stock</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}