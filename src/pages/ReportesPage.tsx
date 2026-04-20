import { useState, useEffect } from 'react';
import { getVentas, getProductos } from '@/lib/store';
import { Venta, Producto } from '@/lib/types';
import { BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['hsl(215, 80%, 52%)', 'hsl(145, 60%, 42%)', 'hsl(38, 90%, 55%)', 'hsl(0, 72%, 55%)'];

export default function ReportesPage() {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);

  // Cargamos ventas y productos en paralelo al montar la página
  useEffect(() => {
    Promise.all([getVentas(), getProductos()]).then(([v, p]) => {
      setVentas(v);
      setProductos(p);
      setCargando(false);
    });
  }, []);

  // Ventas por día (últimos 7 días) — se calcula con los datos ya cargados
  const hoy = new Date();
  const diasData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(hoy);
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    const total = ventas.filter(v => v.fecha.startsWith(key)).reduce((s, v) => s + v.total, 0);
    return { dia: d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' }), total };
  });

  // Productos más vendidos
  const conteo: Record<string, number> = {};
  ventas.forEach(v => v.items.forEach(i => { conteo[i.nombre] = (conteo[i.nombre] || 0) + i.cantidad; }));
  const topProductos = Object.entries(conteo).sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([nombre, cantidad]) => ({ nombre, cantidad }));

  // Por método de pago
  const porMetodo = [
    { nombre: 'Efectivo', total: ventas.filter(v => v.metodoPago === 'efectivo').reduce((s, v) => s + v.total, 0) },
    { nombre: 'Mercado Pago', total: ventas.filter(v => v.metodoPago === 'mercadopago').reduce((s, v) => s + v.total, 0) },
    { nombre: 'Tarjeta', total: ventas.filter(v => v.metodoPago === 'tarjeta').reduce((s, v) => s + v.total, 0) },
  ].filter(m => m.total > 0);

  const totalVentas = ventas.reduce((s, v) => s + v.total, 0);

  if (cargando) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Cargando reportes...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="page-header flex items-center gap-2"><BarChart3 className="h-6 w-6" /> Reportes</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="pos-card"><p className="text-sm text-muted-foreground">Total vendido</p><p className="text-2xl font-bold">${totalVentas.toLocaleString('es-AR')}</p></div>
        <div className="pos-card"><p className="text-sm text-muted-foreground">Ventas realizadas</p><p className="text-2xl font-bold">{ventas.length}</p></div>
        <div className="pos-card"><p className="text-sm text-muted-foreground">Productos en stock</p><p className="text-2xl font-bold">{productos.length}</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="pos-card">
          <h3 className="font-semibold mb-4">Ventas últimos 7 días</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={diasData}>
              <XAxis dataKey="dia" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number) => `$${v.toLocaleString('es-AR')}`} />
              <Bar dataKey="total" fill="hsl(215, 80%, 52%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="pos-card">
          <h3 className="font-semibold mb-4">Ingresos por método de pago</h3>
          {porMetodo.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={porMetodo} dataKey="total" nameKey="nombre" cx="50%" cy="50%" outerRadius={80}
                  label={({ nombre, percent }) => `${nombre} ${(percent * 100).toFixed(0)}%`}>
                  {porMetodo.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => `$${v.toLocaleString('es-AR')}`} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-muted-foreground text-center py-10 text-sm">Sin datos</p>}
        </div>

        <div className="pos-card lg:col-span-2">
          <h3 className="font-semibold mb-4">Productos más vendidos</h3>
          {topProductos.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topProductos} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="nombre" type="category" tick={{ fontSize: 12 }} width={120} />
                <Tooltip />
                <Bar dataKey="cantidad" fill="hsl(145, 60%, 42%)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-muted-foreground text-center py-10 text-sm">Sin datos</p>}
        </div>
      </div>
    </div>
  );
}