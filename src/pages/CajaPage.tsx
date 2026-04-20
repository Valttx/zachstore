import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getCaja, setCaja, getMovimientos, addMovimiento, getVentas } from '@/lib/store';
import { Caja, MovimientoCaja, Venta } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Wallet, DoorOpen, DoorClosed, Plus, Minus } from 'lucide-react';
import { toast } from 'sonner';

export default function CajaPage() {
  const { user } = useAuth();

  // Estado local — se llena desde Supabase al cargar
  const [caja, setCajaState] = useState<Caja | null>(null);
  const [movimientos, setMovimientos] = useState<MovimientoCaja[]>([]);
  const [ventasCaja, setVentasCaja] = useState<Venta[]>([]);
  const [cargando, setCargando] = useState(true);

  const [abrirDialog, setAbrirDialog] = useState(false);
  const [montoInicial, setMontoInicial] = useState('');
  const [gastoDialog, setGastoDialog] = useState(false);
  const [gastoMonto, setGastoMonto] = useState('');
  const [gastoConcepto, setGastoConcepto] = useState('');
  const [cierreDialog, setCierreDialog] = useState(false);
  const [efectivoReal, setEfectivoReal] = useState('');

  // Cargamos el estado de la caja al montar la página
  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    const [cajaData, movsData, ventasData] = await Promise.all([
      getCaja(),
      getMovimientos(),
      getVentas(),
    ]);
    setCajaState(cajaData);
    setMovimientos(movsData);
    setVentasCaja(ventasData);
    setCargando(false);
  };

  const abrirCaja = async () => {
    const monto = parseFloat(montoInicial);
    if (isNaN(monto) || monto < 0) { toast.error('Monto inválido'); return; }

    // Creamos la caja en Supabase
    await setCaja({ montoInicial: monto, usuario: user?.nombre || '', abierta: true });

    // Registramos el movimiento de apertura
    await addMovimiento({
      tipo: 'ingreso', monto, concepto: 'Apertura de caja',
      usuario: user?.nombre || '', fecha: new Date().toISOString(),
    });

    setAbrirDialog(false);
    setMontoInicial('');
    toast.success('Caja abierta');
    cargarDatos(); // recargamos para reflejar el estado nuevo
  };

  const registrarGasto = async () => {
    const monto = parseFloat(gastoMonto);
    if (isNaN(monto) || monto <= 0 || !gastoConcepto.trim()) { toast.error('Completá todos los campos'); return; }

    await addMovimiento({
      tipo: 'egreso', monto, concepto: gastoConcepto,
      usuario: user?.nombre || '', fecha: new Date().toISOString(),
    });

    setGastoDialog(false);
    setGastoMonto('');
    setGastoConcepto('');
    toast.success('Gasto registrado');
    cargarDatos();
  };

  const cerrarCaja = async () => {
    if (!caja) return;
    const real = parseFloat(efectivoReal);
    if (isNaN(real)) { toast.error('Ingresá el monto real'); return; }

    // Actualizamos la caja como cerrada en Supabase
    await setCaja({ id: caja.id, abierta: false, fechaCierre: new Date().toISOString() });

    setCierreDialog(false);
    setEfectivoReal('');
    toast.success(`Caja cerrada. Diferencia: $${(real - (totalIngresos - totalEgresos)).toLocaleString('es-AR')}`);
    cargarDatos();
  };

  // Cálculos para mostrar el resumen — filtramos los movimientos de esta sesión
  const movsCaja = caja
    ? movimientos.filter(m => new Date(m.fecha) >= new Date(caja.fechaApertura))
    : [];
  const totalIngresos = movsCaja.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0);
  const totalEgresos = movsCaja.filter(m => m.tipo === 'egreso').reduce((s, m) => s + m.monto, 0);

  // Ventas de esta sesión agrupadas por método de pago
  const ventasSession = caja
    ? ventasCaja.filter(v => new Date(v.fecha) >= new Date(caja.fechaApertura))
    : [];
  const porMetodo = { efectivo: 0, mercadopago: 0, tarjeta: 0 };
  ventasSession.forEach(v => { porMetodo[v.metodoPago] += v.total; });

  if (cargando) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Cargando caja...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="page-header flex items-center gap-2"><Wallet className="h-6 w-6" /> Caja</h2>
        <div className="flex gap-2">
          {!caja?.abierta ? (
            <Button onClick={() => setAbrirDialog(true)} className="gap-2"><DoorOpen className="h-4 w-4" /> Abrir caja</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setGastoDialog(true)} className="gap-2"><Minus className="h-4 w-4" /> Registrar gasto</Button>
              <Button variant="destructive" onClick={() => setCierreDialog(true)} className="gap-2"><DoorClosed className="h-4 w-4" /> Cerrar caja</Button>
            </>
          )}
        </div>
      </div>

      {caja?.abierta && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="pos-card">
            <p className="text-sm text-muted-foreground">Total ingresos</p>
            <p className="text-2xl font-bold text-success">${totalIngresos.toLocaleString('es-AR')}</p>
          </div>
          <div className="pos-card">
            <p className="text-sm text-muted-foreground">Total egresos</p>
            <p className="text-2xl font-bold text-destructive">${totalEgresos.toLocaleString('es-AR')}</p>
          </div>
          <div className="pos-card">
            <p className="text-sm text-muted-foreground">Efectivo esperado</p>
            <p className="text-2xl font-bold">${(totalIngresos - totalEgresos).toLocaleString('es-AR')}</p>
          </div>
        </div>
      )}

      {caja?.abierta && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="pos-card"><p className="text-sm text-muted-foreground">Efectivo</p><p className="text-lg font-semibold">${porMetodo.efectivo.toLocaleString('es-AR')}</p></div>
          <div className="pos-card"><p className="text-sm text-muted-foreground">Mercado Pago</p><p className="text-lg font-semibold">${porMetodo.mercadopago.toLocaleString('es-AR')}</p></div>
          <div className="pos-card"><p className="text-sm text-muted-foreground">Tarjeta</p><p className="text-lg font-semibold">${porMetodo.tarjeta.toLocaleString('es-AR')}</p></div>
        </div>
      )}

      <div className="pos-card">
        <h3 className="font-semibold mb-3">Movimientos recientes</h3>
        <div className="space-y-2 max-h-96 overflow-auto">
          {movsCaja.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              {caja?.abierta ? 'Sin movimientos' : 'Abrí la caja para comenzar'}
            </p>
          ) : movsCaja.map(m => (
            <div key={m.id} className="flex items-center justify-between py-2 border-b last:border-0">
              <div>
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${m.tipo === 'ingreso' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                  {m.tipo === 'ingreso' ? <Plus className="h-3 w-3" /> : <Minus className="h-3 w-3" />}{m.tipo}
                </span>
                <span className="ml-2 text-sm">{m.concepto}</span>
              </div>
              <div className="text-right">
                <span className={`font-semibold ${m.tipo === 'ingreso' ? 'text-success' : 'text-destructive'}`}>
                  {m.tipo === 'ingreso' ? '+' : '-'}${m.monto.toLocaleString('es-AR')}
                </span>
                <p className="text-xs text-muted-foreground">
                  {new Date(m.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dialog abrir caja */}
      <Dialog open={abrirDialog} onOpenChange={setAbrirDialog}>
        <DialogContent><DialogHeader><DialogTitle>Abrir caja</DialogTitle></DialogHeader>
          <Label>Monto inicial ($)</Label>
          <Input type="number" value={montoInicial} onChange={e => setMontoInicial(e.target.value)} placeholder="0" />
          <DialogFooter><Button onClick={abrirCaja}>Abrir</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog gasto */}
      <Dialog open={gastoDialog} onOpenChange={setGastoDialog}>
        <DialogContent><DialogHeader><DialogTitle>Registrar gasto</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Concepto</Label><Input value={gastoConcepto} onChange={e => setGastoConcepto(e.target.value)} /></div>
            <div><Label>Monto ($)</Label><Input type="number" value={gastoMonto} onChange={e => setGastoMonto(e.target.value)} /></div>
          </div>
          <DialogFooter><Button onClick={registrarGasto}>Registrar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog cierre */}
      <Dialog open={cierreDialog} onOpenChange={setCierreDialog}>
        <DialogContent><DialogHeader><DialogTitle>Cerrar caja</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Efectivo esperado: <strong>${(totalIngresos - totalEgresos).toLocaleString('es-AR')}</strong></p>
          <Label>Efectivo real en caja ($)</Label>
          <Input type="number" value={efectivoReal} onChange={e => setEfectivoReal(e.target.value)} />
          <DialogFooter><Button variant="destructive" onClick={cerrarCaja}>Confirmar cierre</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}