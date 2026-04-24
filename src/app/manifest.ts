import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Truck Finanças',
    short_name: 'TruckFin',
    description: 'Gestão financeira de fretes para motoristas e donos de frota.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#f8fafc',
    theme_color: '#2563eb',
    categories: ['business', 'finance'],
    lang: 'pt-BR',
    dir: 'ltr',
    icons: [
      {
        src: '/brand-logo-rounded.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/brand-logo-rounded.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/brand-logo-rounded.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
