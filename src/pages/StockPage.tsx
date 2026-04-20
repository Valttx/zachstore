import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
// Importamos las nuevas funciones async del store
import { getProductos, addProducto, updateProducto, deleteProducto, addCambioStock } from '@/lib/store';
import { Producto } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Package, Plus, Pencil, Trash2, Search, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const emptyProduct = (): Partial<Producto> => ({
  codigo: '', nombre: '', talle: '', color: '', precioCompra: 0, margen: 0, stock: 0,
});

export default function StockPage() {
  const { user } = useAuth();

  // Estado local de productos (lo llenamos desde Supabase)
  const [productos, setProds] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<Partial<Producto>>(emptyProduct());
  const [isEdit, setIsEdit] = useState(false);
  const [ajusteDialog, setAjusteDialog] = useState<{ prod: Producto; cantidad: string } | null>(null);

  // useEffect se ejecuta cuando el componente carga por primera vez
  // Trae los productos de Supabase y los guarda en el estado local
  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    setCargando(true);
    const data = await getProductos();
    setProds(data);
    setCargando(false);
  };

  const filtered = productos.filter(p => {
    const q = busqueda.toLowerCase();
    return p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q);
  });

  const openNew = () => { setEditando(emptyProduct()); setIsEdit(false); setDialogOpen(true); };
  const openEdit = (p: Producto) => { setEditando({ ...p }); setIsEdit(true); setDialogOpen(true); };

  // guardar también es async porque escribe en Supabase
  const guardar = async () => {
    const { codigo, nombre, talle, color, precioCompra, margen, stock } = editando;
    if (!codigo || !nombre) { toast.error('Código y nombre son obligatorios'); return; }

    const precioFinal = (precioCompra || 0) * (1 + (margen || 0) / 100);

    if (isEdit) {
      await updateProducto({ ...editando, precioFinal } as Producto);
      toast.success('Producto actualizado');
    } else {
      await addProducto({
        codigo: codigo!, nombre: nombre!, talle: talle || '', color: color || '',
        precioCompra: precioCompra || 0, margen: margen || 0, precioFinal,
        stock: stock || 0, creadoPor: user?.nombre || '',
        fechaCreacion: new Date().toISOString(),
      });
      toast.success('Producto agregado');
    }

    setDialogOpen(false);
    cargarProductos(); // recargamos desde Supabase para ver los cambios
  };

  const eliminar = async (id: string) => {
    await deleteProducto(id);
    cargarProductos();
    toast.success('Producto eliminado');
  };

  const ajustarStock = async () => {
    if (!ajusteDialog) return;
    const cant = parseInt(ajusteDialog.cantidad);
    if (isNaN(cant)) { toast.error('Cantidad inválida'); return; }

    const prod = ajusteDialog.prod;
    const nuevoStock = prod.stock + cant;
    if (nuevoStock < 0) { toast.error('El stock no puede ser negativo'); return; }

    // Actualizamos el producto con el nuevo stock
    await updateProducto({ ...prod, stock: nuevoStock });

    // Registramos el cambio en el historial de stock
    await addCambioStock({
      productoId: prod.id, productoNombre: prod.nombre,
      tipo: 'ajuste', cantidad: cant,
      stockAnterior: prod.stock, stockNuevo: nuevoStock,
      usuario: user?.nombre || '', fecha: new Date().toISOString(),
    });

    setAjusteDialog(null);
    cargarProductos();
    toast.success('Stock ajustado');
  };

  if (cargando) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Cargando productos...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="page-header flex items-center gap-2"><Package className="h-6 w-6" /> Stock</h2>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Agregar producto</Button>
      </div>
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar producto..." value={busqueda} onChange={e => setBusqueda(e.target.value)} className="pl-10" />
      </div>

      <div className="pos-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-3 font-medium">Código</th><th className="pb-3 font-medium">Nombre</th>
              <th className="pb-3 font-medium">Talle</th><th className="pb-3 font-medium">Color</th>
              <th className="pb-3 font-medium text-right">Costo</th><th className="pb-3 font-medium text-right">Margen</th>
              <th className="pb-3 font-medium text-right">Precio</th><th className="pb-3 font-medium text-right">Stock</th>
              <th className="pb-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} className="border-b last:border-0 hover:bg-secondary/30">
                <td className="py-3 font-mono text-xs">{p.codigo}</td>
                <td className="py-3 font-medium">{p.nombre}</td>
                <td className="py-3">{p.talle}</td>
                <td className="py-3">{p.color}</td>
                <td className="py-3 text-right">${p.precioCompra.toLocaleString('es-AR')}</td>
                <td className="py-3 text-right">{p.margen}%</td>
                <td className="py-3 text-right font-semibold">${p.precioFinal.toLocaleString('es-AR')}</td>
                <td className="py-3 text-right">
                  <span className={`inline-flex items-center gap-1 ${p.stock <= 3 ? 'text-destructive font-medium' : ''}`}>
                    {p.stock <= 3 && <AlertTriangle className="h-3 w-3" />}{p.stock}
                  </span>
                </td>
                <td className="py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setAjusteDialog({ prod: p, cantidad: '' })} title="Ajustar stock">
                      <Package className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => eliminar(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="py-10 text-center text-muted-foreground">No hay productos</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Dialog agregar/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{isEdit ? 'Editar producto' : 'Nuevo producto'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Código</Label><Input value={editando.codigo || ''} onChange={e => setEditando(p => ({ ...p, codigo: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Nombre</Label><Input value={editando.nombre || ''} onChange={e => setEditando(p => ({ ...p, nombre: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Talle</Label><Input value={editando.talle || ''} onChange={e => setEditando(p => ({ ...p, talle: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Color</Label><Input value={editando.color || ''} onChange={e => setEditando(p => ({ ...p, color: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Precio costo</Label><Input type="number" value={editando.precioCompra || ''} onChange={e => setEditando(p => ({ ...p, precioCompra: +e.target.value }))} /></div>
            <div className="space-y-1"><Label>Margen %</Label><Input type="number" value={editando.margen || ''} onChange={e => setEditando(p => ({ ...p, margen: +e.target.value }))} /></div>
            <div className="space-y-1">
              <Label>Precio final</Label>
              <Input disabled value={`$${((editando.precioCompra || 0) * (1 + (editando.margen || 0) / 100)).toLocaleString('es-AR')}`} />
            </div>
            <div className="space-y-1"><Label>Stock</Label><Input type="number" value={editando.stock || ''} onChange={e => setEditando(p => ({ ...p, stock: +e.target.value }))} /></div>
          </div>
          <DialogFooter><Button onClick={guardar}>{isEdit ? 'Guardar cambios' : 'Agregar'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog ajuste de stock */}
      <Dialog open={!!ajusteDialog} onOpenChange={() => setAjusteDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ajustar stock: {ajusteDialog?.prod.nombre}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Stock actual: {ajusteDialog?.prod.stock}. Ingresá la cantidad a sumar (positivo) o restar (negativo).</p>
          <Input type="number" value={ajusteDialog?.cantidad || ''} onChange={e => setAjusteDialog(prev => prev ? { ...prev, cantidad: e.target.value } : null)} placeholder="Ej: 10 o -5" />
          <DialogFooter><Button onClick={ajustarStock}>Confirmar ajuste</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}