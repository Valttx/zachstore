import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getProductos, addVenta, updateProducto, addMovimiento, addCambioStock, getCaja } from '@/lib/store';
import { Producto, ItemCarrito, MetodoPago, Venta } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, Minus, Trash2, ShoppingCart, CreditCard, Banknote, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

export default function VentasPage() {
  const { user } = useAuth();
  const [busqueda, setBusqueda] = useState('');
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo');
  const [procesando, setProcesando] = useState(false);

  // Productos se cargan desde Supabase al montar la página
  const [productos, setProductos] = useState<Producto[]>([]);

  useEffect(() => {
    getProductos().then(setProductos);
  }, []);

  const resultados = useMemo(() => {
    if (!busqueda.trim()) return [];
    const q = busqueda.toLowerCase();
    return productos.filter(p =>
      p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [busqueda, productos]);

  const agregarAlCarrito = (prod: Producto) => {
    if (prod.stock <= 0) { toast.error('Sin stock disponible'); return; }
    setCarrito(prev => {
      const exists = prev.find(i => i.producto.id === prod.id);
      if (exists) {
        if (exists.cantidad >= prod.stock) { toast.error('Stock insuficiente'); return prev; }
        return prev.map(i => i.producto.id === prod.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      }
      return [...prev, { producto: prod, cantidad: 1 }];
    });
    setBusqueda('');
  };

  const cambiarCantidad = (id: string, delta: number) => {
    setCarrito(prev => prev.map(i => {
      if (i.producto.id !== id) return i;
      const nueva = i.cantidad + delta;
      if (nueva <= 0) return i;
      if (nueva > i.producto.stock) { toast.error('Stock insuficiente'); return i; }
      return { ...i, cantidad: nueva };
    }));
  };

  const eliminarItem = (id: string) => setCarrito(prev => prev.filter(i => i.producto.id !== id));

  const total = carrito.reduce((s, i) => s + i.producto.precioFinal * i.cantidad, 0);

  // completarVenta es async porque hace varias escrituras en Supabase
  const completarVenta = async () => {
    if (carrito.length === 0) { toast.error('El carrito está vacío'); return; }

    // Verificamos que la caja esté abierta (consultando Supabase)
    const caja = await getCaja();
    if (!caja?.abierta) { toast.error('La caja no está abierta'); return; }

    setProcesando(true);
    try {
      // 1. Armamos el objeto venta
      const venta: Venta = {
        id: crypto.randomUUID(),
        items: carrito.map(i => ({
          productoId: i.producto.id, codigo: i.producto.codigo, nombre: i.producto.nombre,
          cantidad: i.cantidad, precioUnitario: i.producto.precioFinal,
          subtotal: i.producto.precioFinal * i.cantidad,
        })),
        total, metodoPago, usuario: user?.nombre || '', fecha: new Date().toISOString(),
      };

      // 2. Guardamos la venta y sus ítems en Supabase
      await addVenta(venta);

      // 3. Actualizamos el stock de cada producto vendido
      for (const item of carrito) {
        const nuevoStock = item.producto.stock - item.cantidad;
        await updateProducto({ ...item.producto, stock: nuevoStock });
        await addCambioStock({
          productoId: item.producto.id, productoNombre: item.producto.nombre,
          tipo: 'venta', cantidad: -item.cantidad,
          stockAnterior: item.producto.stock, stockNuevo: nuevoStock,
          usuario: user?.nombre || '', fecha: new Date().toISOString(),
        });
      }

      // 4. Registramos el ingreso en los movimientos de caja
      await addMovimiento({
        tipo: 'ingreso', monto: total,
        concepto: `Venta #${venta.id.slice(0, 6)}`,
        ventaId: venta.id, usuario: user?.nombre || '',
        fecha: new Date().toISOString(),
      });

      // 5. Limpiamos el carrito y recargamos los productos con stock actualizado
      setCarrito([]);
      const productosActualizados = await getProductos();
      setProductos(productosActualizados);
      toast.success(`Venta completada: $${total.toLocaleString('es-AR')}`);
    } catch (e) {
      toast.error('Error al procesar la venta');
    } finally {
      setProcesando(false);
    }
  };

  const metodos: { key: MetodoPago; label: string; icon: React.ReactNode }[] = [
    { key: 'efectivo', label: 'Efectivo', icon: <Banknote className="h-4 w-4" /> },
    { key: 'mercadopago', label: 'MP', icon: <Smartphone className="h-4 w-4" /> },
    { key: 'tarjeta', label: 'Tarjeta', icon: <CreditCard className="h-4 w-4" /> },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-[calc(100vh-5rem)]">
      {/* Buscador de productos */}
      <div className="lg:col-span-3 flex flex-col gap-4">
        <h2 className="page-header flex items-center gap-2"><ShoppingCart className="h-6 w-6" /> Punto de Venta</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o código (escáner)..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="pl-10 h-12 text-base"
            autoFocus
          />
        </div>
        {resultados.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {resultados.map(p => (
              <button
                key={p.id}
                onClick={() => agregarAlCarrito(p)}
                className="pos-card text-left hover:border-primary/50 transition-colors cursor-pointer"
              >
                <div className="font-medium">{p.nombre}</div>
                <div className="text-sm text-muted-foreground">{p.codigo} · {p.talle} · {p.color}</div>
                <div className="flex justify-between mt-1">
                  <span className="font-semibold text-primary">${p.precioFinal.toLocaleString('es-AR')}</span>
                  <span className={`text-sm ${p.stock <= 3 ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                    Stock: {p.stock}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
        {busqueda && resultados.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No se encontraron productos</p>
        )}
      </div>

      {/* Carrito */}
      <div className="lg:col-span-2 pos-card flex flex-col">
        <h3 className="font-semibold text-lg mb-3">Carrito ({carrito.length})</h3>
        <div className="flex-1 overflow-auto space-y-2 min-h-0">
          {carrito.length === 0 ? (
            <p className="text-muted-foreground text-center py-10 text-sm">Agregá productos para comenzar</p>
          ) : carrito.map(item => (
            <div key={item.producto.id} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{item.producto.nombre}</div>
                <div className="text-xs text-muted-foreground">${item.producto.precioFinal.toLocaleString('es-AR')} c/u</div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => cambiarCantidad(item.producto.id, -1)}><Minus className="h-3 w-3" /></Button>
                <span className="w-8 text-center text-sm font-medium">{item.cantidad}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => cambiarCantidad(item.producto.id, 1)}><Plus className="h-3 w-3" /></Button>
              </div>
              <span className="font-semibold text-sm w-20 text-right">${(item.producto.precioFinal * item.cantidad).toLocaleString('es-AR')}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => eliminarItem(item.producto.id)}><Trash2 className="h-3 w-3" /></Button>
            </div>
          ))}
        </div>

        <div className="border-t pt-3 mt-3 space-y-3">
          <div className="flex justify-between text-xl font-bold">
            <span>Total</span>
            <span>${total.toLocaleString('es-AR')}</span>
          </div>
          <div className="flex gap-2">
            {metodos.map(m => (
              <Button
                key={m.key}
                variant={metodoPago === m.key ? 'default' : 'outline'}
                className="flex-1 gap-1"
                size="sm"
                onClick={() => setMetodoPago(m.key)}
              >
                {m.icon} {m.label}
              </Button>
            ))}
          </div>
          <Button
            className="w-full h-12 text-base"
            onClick={completarVenta}
            disabled={carrito.length === 0 || procesando}
          >
            {procesando ? 'Procesando...' : `Cobrar $${total.toLocaleString('es-AR')}`}
          </Button>
        </div>
      </div>
    </div>
  );
}