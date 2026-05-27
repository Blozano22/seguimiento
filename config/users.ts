export type UserRole = 'Gestor' | 'Diseñador Instruccional' | 'Coordinador' | 'Super Admin';

export interface AppUser {
  username: string;    // e.g. "kmunoz"
  nombre: string;      // e.g. "Karina Muñoz Sierra"
  email: string;
  role: UserRole;
  passwordEnvKey: string; // key to read from process.env
}

export const USERS: AppUser[] = [
  // Gestores
  { username: 'cnavarro',   nombre: 'Claudia Navarro',          email: 'cnavarro@americana.edu.co',   role: 'Gestor', passwordEnvKey: 'PASS_CNAVARRO' },
  { username: 'amendoza',   nombre: 'Aimar Mendoza',             email: 'amendoza@americana.edu.co',   role: 'Gestor', passwordEnvKey: 'PASS_AMENDOZA' },
  { username: 'nsalas',     nombre: 'Nayerlis Salas',            email: 'nsalas@americana.edu.co',     role: 'Gestor', passwordEnvKey: 'PASS_NSALAS' },
  { username: 'cavendano',  nombre: 'Caroll Avendaño',           email: 'cavendano@americana.edu.co',  role: 'Gestor', passwordEnvKey: 'PASS_CAVENDANO' },
  { username: 'kmunoz',     nombre: 'Karina Muñoz Sierra',       email: 'kmunoz@americana.edu.co',     role: 'Gestor', passwordEnvKey: 'PASS_KMUNOZ' },
  { username: 'spalencia',  nombre: 'Samir Palencia Gerónimo',   email: 'spalencia@americana.edu.co',  role: 'Gestor', passwordEnvKey: 'PASS_SPALENCIA' },
  { username: 'mjortega',   nombre: 'María Jose Ortega',         email: 'mjortega@americana.edu.co',   role: 'Gestor', passwordEnvKey: 'PASS_MJORTEGA' },
  { username: 'anunez',     nombre: 'Andrea Nuñez',              email: 'anunez@americana.edu.co',     role: 'Gestor', passwordEnvKey: 'PASS_ANUNEZ' },
  { username: 'yromero',    nombre: 'Yelitza Romero',            email: 'yromero@americana.edu.co',    role: 'Gestor', passwordEnvKey: 'PASS_YROMERO' },
  { username: 'hojeda',     nombre: 'Hillary Ojeda Durango',     email: 'hojeda@americana.edu.co',     role: 'Gestor', passwordEnvKey: 'PASS_HOJEDA' },
  // DI
  { username: 'avelandia',  nombre: 'Andres Velandia',           email: 'blozano@americana.edu.co',    role: 'Diseñador Instruccional', passwordEnvKey: 'PASS_AVELANDIA' },
  // Coordinador
  { username: 'coordinador', nombre: 'Coordinador',              email: '',                            role: 'Coordinador', passwordEnvKey: 'PASS_ASIGNADOR' },
  // Super Admin
  { username: 'admin',      nombre: 'Super Admin',               email: '',                            role: 'Super Admin', passwordEnvKey: 'PASS_ADMIN' },
];

export function getUserByUsername(username: string): AppUser | undefined {
  return USERS.find(u => u.username === username);
}
