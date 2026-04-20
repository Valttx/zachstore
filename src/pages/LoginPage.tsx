import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShoppingCart } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  // "cargando" evita que el botón se presione dos veces mientras espera Supabase
  const [cargando, setCargando] = useState(false);

  // handleSubmit ahora es async porque login consulta la base de datos
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setError('');
    const err = await login(usuario, password);
    if (err) {
      setError(err);
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-4">
            <ShoppingCart className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Mi Tienda</h1>
          <p className="text-muted-foreground text-sm mt-1">Sistema de gestión</p>
        </div>
        <form onSubmit={handleSubmit} className="pos-card space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user">Usuario</Label>
            <Input id="user" value={usuario} onChange={e => setUsuario(e.target.value)} placeholder="admin" autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pass">Contraseña</Label>
            <Input id="pass" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full h-11 text-base" disabled={cargando}>
            {cargando ? 'Ingresando...' : 'Ingresar'}
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-3">
            Demo: admin / admin123
          </p>
        </form>
      </div>
    </div>
  );
}