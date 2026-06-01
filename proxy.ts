import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const role = req.nextauth.token?.role as string | undefined;
    const path = req.nextUrl.pathname;

    // Role-based redirects after login
    if (path === '/') {
      if (role === 'Gestor') return NextResponse.redirect(new URL('/gestor', req.url));
      if (role === 'Diseñador Instruccional') return NextResponse.redirect(new URL('/di', req.url));
      if (role === 'Coordinador') {
        const email = req.nextauth.token?.email as string | undefined;
        if (email === 'coordinacion_di@americana.edu.co') return NextResponse.redirect(new URL('/coordinador-di', req.url));
        return NextResponse.redirect(new URL('/coordinador', req.url));
      }
      if (role === 'Super Admin') return NextResponse.redirect(new URL('/admin', req.url));
    }

    // Legacy redirect
    if (path.startsWith('/asignador')) return NextResponse.redirect(new URL('/coordinador', req.url));

    // Protect role-specific routes
    if (path.startsWith('/gestor') && role !== 'Gestor') return NextResponse.redirect(new URL('/login', req.url));
    if (path.startsWith('/di') && role !== 'Diseñador Instruccional') return NextResponse.redirect(new URL('/login', req.url));
    if (path.startsWith('/coordinador') && role !== 'Coordinador') return NextResponse.redirect(new URL('/login', req.url));
    if (path.startsWith('/admin') && role !== 'Super Admin') return NextResponse.redirect(new URL('/login', req.url));

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        if (path.startsWith('/login') || path.startsWith('/api/auth')) return true;
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth).*)'],
};
