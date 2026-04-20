export type UserRole = 'admin' | 'cajero';

export interface User {
  id: string;
  nombre: string;
  usuario: string;
  password: string;
  rol: UserRole;
}

export interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  talle: string;
  color: string;
  precioCompra: number;
  margen: number;
  precioFinal: number;
  stock: number;
  creadoPor: string;
  fechaCreacion: string;
}

export interface ItemCarrito {
  producto: Producto;
  cantidad: number;
}

export type MetodoPago = 'efectivo' | 'mercadopago' | 'tarjeta';

export interface Venta {
  id: string;
  items: { productoId: string; codigo: string; nombre: string; cantidad: number; precioUnitario: number; subtotal: number }[];
  total: number;
  metodoPago: MetodoPago;
  usuario: string;
  fecha: string;
}

export interface MovimientoCaja {
  id: string;
  tipo: 'ingreso' | 'egreso';
  monto: number;
  concepto: string;
  ventaId?: string;
  usuario: string;
  fecha: string;
}

export interface Caja {
  id: string;
  montoInicial: number;
  abierta: boolean;
  fechaApertura: string;
  fechaCierre?: string;
  usuario: string;
}

export interface CambioStock {
  id: string;
  productoId: string;
  productoNombre: string;
  tipo: 'venta' | 'ajuste' | 'ingreso';
  cantidad: number;
  stockAnterior: number;
  stockNuevo: number;
  usuario: string;
  fecha: string;
}
