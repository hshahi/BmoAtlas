import { initFederation } from '@angular-architects/native-federation';

initFederation('federation.manifest.json')
  .then(() => import('./bootstrap'))
  .catch((err) => {
    console.error('Federation init failed, bootstrapping without federation:', err);
    return import('./bootstrap');
  })
  .catch((err) => console.error('Bootstrap failed:', err));
