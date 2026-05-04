export type RolUsuario = 'superadmin' | 'admin' | 'abogado' | 'psicosocial';

export interface Usuario {
  uid: string;
  nombre_completo: string;
  correo: string;
  rol: RolUsuario;
  especialidad?: string;
  estado: 'Activo' | 'Inactivo';
  fecha_creacion?: string;
}

// Mantenemos alias para compatibilidad temporal con el resto de tu código
// hasta que refactoricemos los demás archivos.
export type UserRole = RolUsuario;
export type UserProfile = Usuario;