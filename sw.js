self.addEventListener('install', e => {
  e.waitUntil(
    caches.open('catalogo-v1').then(cache =>
      cache.addAll([
        './',
        './index.html',
        './cart.html',
        './checkout.html',
        './admin.html'
      ])
    )
  );
});
