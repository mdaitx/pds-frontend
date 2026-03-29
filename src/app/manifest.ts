import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Truck Finanças',
    short_name: 'Truck Finanças',
    description: 'Gestão financeira de fretes para motoristas e donos de frota.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#fafafa',
    theme_color: '#2563eb',
    categories: ['business', 'finance'],
    lang: 'pt-BR',
    icons: [
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
