import { supabase } from './supabase';
import { User, Producto, Venta, MovimientoCaja, Caja, CambioStock, UserRole } from './types';

// ─────────────────────────────────────────────────────────────
// USUARIOS
// ─────────────────────────────────────────────────────────────

export async function getUsers(): Promise<User[]> {
  const { data } = await supabase.from('usuarios').select('*');
  return (data || []).map(u => ({
    id: u.id, nombre: u.nombre, usuario: u.usuario,
    password: u.password, rol: u.rol as UserRole,
  }));
}

// El usuario actual se sigue guardando en localStorage
// porque es solo una referencia de sesión, no datos de negocio
export async function getCurrentUser(): Promise<User | null> {
  const raw = localStorage.getItem('pos_current_user');
  return raw ? JSON.parse(raw) : null;
}

export function setCurrentUser(u: User | null) {
  localStorage.setItem('pos_current_user', JSON.stringify(u));
}

// Busca el usuario en Supabase para hacer login
export async function loginUser(usuario: string, password: string): Promise<User | null> {
  const { data } = await supabase
    .from('usuarios')
    .select('*')
    .eq('usuario', usuario)
    .eq('password', password)
    .single();
  if (!data) return null;
  return { id: data.id, nombre: data.nombre, usuario: data.usuario, password: data.password, rol: data.rol };
}

export async function addUser(u: Omit<User, 'id'>): Promise<void> {
  await supabase.from('usuarios').insert({
    nombre: u.nombre, usuario: u.usuario, password: u.password, rol: u.rol,
  });
}

export async function updateUser(u: User): Promise<void> {
  await supabase.from('usuarios').update({
    nombre: u.nombre, usuario: u.usuario, password: u.password, rol: u.rol,
  }).eq('id', u.id);
}

export async function deleteUser(id: string): Promise<void> {
  await supabase.from('usuarios').delete().eq('id', id);
}

// ─────────────────────────────────────────────────────────────
// PRODUCTOS
// ─────────────────────────────────────────────────────────────

export async function getProductos(): Promise<Producto[]> {
  const { data } = await supabase
    .from('productos')
    .select('*')
    .order('fecha_creacion', { ascending: false });
  return (data || []).map(p => ({
    id: p.id, codigo: p.codigo, nombre: p.nombre,
    talle: p.talle, color: p.color,
    precioCompra: p.precio_compra, margen: p.margen,
    precioFinal: p.precio_final, stock: p.stock,
    creadoPor: p.creado_por, fechaCreacion: p.fecha_creacion,
  }));
}

export async function addProducto(p: Omit<Producto, 'id'>): Promise<void> {
  await supabase.from('productos').insert({
    codigo: p.codigo, nombre: p.nombre, talle: p.talle, color: p.color,
    precio_compra: p.precioCompra, margen: p.margen,
    precio_final: p.precioFinal, stock: p.stock,
    creado_por: p.creadoPor,
  });
}

export async function updateProducto(p: Producto): Promise<void> {
  await supabase.from('productos').update({
    codigo: p.codigo, nombre: p.nombre, talle: p.talle, color: p.color,
    precio_compra: p.precioCompra, margen: p.margen,
    precio_final: p.precioFinal, stock: p.stock,
  }).eq('id', p.id);
}

export async function deleteProducto(id: string): Promise<void> {
  await supabase.from('productos').delete().eq('id', id);
}

// ─────────────────────────────────────────────────────────────
// VENTAS
// ─────────────────────────────────────────────────────────────

export async function getVentas(): Promise<Venta[]> {
  const { data } = await supabase
    .from('ventas')
    .select('*, ventas_items(*)')
    .order('fecha', { ascending: false });
  return (data || []).map(v => ({
    id: v.id, total: v.total, metodoPago: v.metodo_pago,
    usuario: v.usuario, fecha: v.fecha,
    items: (v.ventas_items || []).map((i: any) => ({
      productoId: i.producto_id, codigo: i.codigo, nombre: i.nombre,
      cantidad: i.cantidad, precioUnitario: i.precio_unitario, subtotal: i.subtotal,
    })),
  }));
}

export async function addVenta(v: Venta): Promise<void> {
  // Primero insertamos la cabecera de la venta y obtenemos el ID generado
  const { data: ventaData } = await supabase
    .from('ventas')
    .insert({ total: v.total, metodo_pago: v.metodoPago, usuario: v.usuario })
    .select()
    .single();
  if (!ventaData) return;

  // Luego insertamos todos los ítems con el ID de la venta
  await supabase.from('ventas_items').insert(
    v.items.map(i => ({
      venta_id: ventaData.id, producto_id: i.productoId,
      codigo: i.codigo, nombre: i.nombre,
      cantidad: i.cantidad, precio_unitario: i.precioUnitario, subtotal: i.subtotal,
    }))
  );
}

// ─────────────────────────────────────────────────────────────
// CAJA
// ─────────────────────────────────────────────────────────────

export async function getCaja(): Promise<Caja | null> {
  // Buscamos la caja que esté abierta (solo puede haber una)
  const { data } = await supabase
    .from('caja')
    .select('*')
    .eq('abierta', true)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id, montoInicial: data.monto_inicial,
    abierta: data.abierta, fechaApertura: data.fecha_apertura,
    fechaCierre: data.fecha_cierre, usuario: data.usuario,
  };
}

export async function setCaja(c: Partial<Caja> & { id?: string }): Promise<void> {
  if (c.id) {
    // Si tiene id, actualizamos la caja existente (cierre)
    await supabase.from('caja').update({
      abierta: c.abierta,
      fecha_cierre: c.fechaCierre,
    }).eq('id', c.id);
  } else {
    // Si no tiene id, creamos una nueva caja (apertura)
    await supabase.from('caja').insert({
      monto_inicial: c.montoInicial,
      usuario: c.usuario,
      abierta: true,
    });
  }
}

// ─────────────────────────────────────────────────────────────
// MOVIMIENTOS DE CAJA
// ─────────────────────────────────────────────────────────────

export async function getMovimientos(): Promise<MovimientoCaja[]> {
  const { data } = await supabase
    .from('movimientos_caja')
    .select('*')
    .order('fecha', { ascending: false });
  return (data || []).map(m => ({
    id: m.id, tipo: m.tipo, monto: m.monto,
    concepto: m.concepto, ventaId: m.venta_id,
    usuario: m.usuario, fecha: m.fecha,
  }));
}

export async function addMovimiento(m: Omit<MovimientoCaja, 'id'>): Promise<void> {
  await supabase.from('movimientos_caja').insert({
    tipo: m.tipo, monto: m.monto, concepto: m.concepto,
    venta_id: m.ventaId, usuario: m.usuario,
  });
}

// ─────────────────────────────────────────────────────────────
// CAMBIOS DE STOCK
// ─────────────────────────────────────────────────────────────

export async function getCambiosStock(): Promise<CambioStock[]> {
  const { data } = await supabase
    .from('cambios_stock')
    .select('*')
    .order('fecha', { ascending: false });
  return (data || []).map(c => ({
    id: c.id, productoId: c.producto_id,
    productoNombre: c.producto_nombre, tipo: c.tipo,
    cantidad: c.cantidad, stockAnterior: c.stock_anterior,
    stockNuevo: c.stock_nuevo, usuario: c.usuario, fecha: c.fecha,
  }));
}

export async function addCambioStock(c: Omit<CambioStock, 'id'>): Promise<void> {
  await supabase.from('cambios_stock').insert({
    producto_id: c.productoId, producto_nombre: c.productoNombre,
    tipo: c.tipo, cantidad: c.cantidad,
    stock_anterior: c.stockAnterior, stock_nuevo: c.stockNuevo,
    usuario: c.usuario,
  });
}