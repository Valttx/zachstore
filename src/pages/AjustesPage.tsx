import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUsers, addUser, updateUser, deleteUser } from '@/lib/store';
import { User, UserRole } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Settings, UserPlus, Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';

export default function AjustesPage() {
  const { user } = useAuth();
  const [users, setUsersState] = useState<User[]>([]);
  const [cargando, setCargando] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<Partial<User>>({ rol: 'cajero' });
  const [isEdit, setIsEdit] = useState(false);

  const isAdmin = user?.rol === 'admin';

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const cargarUsuarios = async () => {
    setCargando(true);
    const data = await getUsers();
    setUsersState(data);
    setCargando(false);
  };

  const guardarUsuario = async () => {
    const { nombre, usuario: uname, password, rol } = editUser;
    if (!nombre || !uname || !password) { toast.error('Completá todos los campos'); return; }

    if (isEdit) {
      await updateUser({ ...editUser } as User);
      toast.success('Usuario actualizado');
    } else {
      await addUser({ nombre, usuario: uname, password, rol: rol as UserRole });
      toast.success('Usuario creado');
    }

    setDialogOpen(false);
    cargarUsuarios();
  };

  const eliminarUsuario = async (id: string) => {
    if (id === user?.id) { toast.error('No podés eliminarte a vos mismo'); return; }
    await deleteUser(id);
    cargarUsuarios();
    toast.success('Usuario eliminado');
  };

  if (cargando) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Cargando ajustes...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="page-header flex items-center gap-2"><Settings className="h-6 w-6" /> Ajustes</h2>

      {/* Gestión de usuarios — solo visible para admin */}
      {isAdmin && (
        <div className="pos-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Usuarios</h3>
            <Button size="sm" onClick={() => { setEditUser({ rol: 'cajero' }); setIsEdit(false); setDialogOpen(true); }} className="gap-2">
              <UserPlus className="h-4 w-4" /> Agregar
            </Button>
          </div>
          <div className="space-y-2">
            {users.map(u => (
              <div key={u.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <span className="font-medium">{u.nombre}</span>
                  <span className="text-sm text-muted-foreground ml-2">@{u.usuario}</span>
                  <span className={`ml-2 text-xs font-medium px-2 py-0.5 rounded-full ${u.rol === 'admin' ? 'bg-primary/10 text-primary' : 'bg-secondary text-secondary-foreground'}`}>
                    {u.rol}
                  </span>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditUser({ ...u }); setIsEdit(true); setDialogOpen(true); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => eliminarUsuario(u.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info de la tienda */}
      <div className="pos-card space-y-2">
        <h3 className="font-semibold">Información de la tienda</h3>
        <p className="text-sm text-muted-foreground">
          Los datos de la tienda se administran directamente en Supabase desde el panel de administración.
        </p>
      </div>

      {/* Dialog crear/editar usuario */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{isEdit ? 'Editar usuario' : 'Nuevo usuario'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nombre</Label><Input value={editUser.nombre || ''} onChange={e => setEditUser(p => ({ ...p, nombre: e.target.value }))} /></div>
            <div><Label>Usuario</Label><Input value={editUser.usuario || ''} onChange={e => setEditUser(p => ({ ...p, usuario: e.target.value }))} /></div>
            <div><Label>Contraseña</Label><Input value={editUser.password || ''} onChange={e => setEditUser(p => ({ ...p, password: e.target.value }))} /></div>
            <div>
              <Label>Rol</Label>
              <div className="flex gap-2 mt-1">
                <Button variant={editUser.rol === 'admin' ? 'default' : 'outline'} size="sm" onClick={() => setEditUser(p => ({ ...p, rol: 'admin' }))}>Admin</Button>
                <Button variant={editUser.rol === 'cajero' ? 'default' : 'outline'} size="sm" onClick={() => setEditUser(p => ({ ...p, rol: 'cajero' }))}>Cajero</Button>
              </div>
            </div>
          </div>
          <DialogFooter><Button onClick={guardarUsuario}>{isEdit ? 'Guardar' : 'Crear'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}