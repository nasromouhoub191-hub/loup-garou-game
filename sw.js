/* Service Worker — تطبيق المستذئبين
   الاستراتيجية: الشبكة أولاً (لتصلك التحديثات تلقائياً)، ثم النسخة المخزّنة عند انقطاع الإنترنت.
   لا تحتاج لتغيير أي رقم عند تحديث ملفاتك؛ يكفي رفعها إلى موقعك. */
const CACHE = 'werewolf-cache';
const NETWORK_TIMEOUT = 4000;
const PRECACHE = ['./', 'manifest.json', 'icon-192.png', 'icon-512.png',
  "Ancien (1).jpg",
  "Ange.jpg",
  "Capitaine.jpg",
  "Carte_SimpleVillaegois.jpg",
  "Chasseur.jpg",
  "Chevalier à l'Épée Rouillée.jpg",
  "Chien-Loup.jpg",
  "Corbeau.jpg",
  "Cupidon.jpg",
  "Deux Sœurs.jpg",
  "Grand-MeFchant-Loup.jpg",
  "Idiot du village.jpg",
  "Les_Loups_Garous_noir.jpg",
  "Loup Blanc.jpg",
  "Ours.jpg",
  "Père des Loups.jpg",
  "Renard.jpg",
  "Salvateur.jpg",
  "Sorcière.jpg",
  "Voleur.jpg",
  "Voyante.jpg",
  "الفتاة الصغيرة.jpg",
  "كبش الفداء.jpg"
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // كل ملف على حدة: غياب ملف واحد لا يُفشل التثبيت
    await Promise.all(PRECACHE.map(u => c.add(new URL(u, self.registration.scope).href).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE && k !== 'werewolf-fonts').map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

function fromNetwork(req){
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), NETWORK_TIMEOUT);
    fetch(req).then(r => { clearTimeout(t); resolve(r); }, err => { clearTimeout(t); reject(err); });
  });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // الخطوط: نسخة مخزّنة أولاً ثم تحديث في الخلفية
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith((async () => {
      const c = await caches.open('werewolf-fonts');
      const hit = await c.match(req);
      const net = fetch(req).then(r => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    })());
    return;
  }

  // أي نطاق آخر (الإعلانات...) يُترك للمتصفح
  if (url.origin !== location.origin) return;

  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    try {
      const res = await fromNetwork(req);
      if (res && res.ok) c.put(req, res.clone());
      return res;
    } catch (err) {
      const hit = await c.match(req, {ignoreSearch: true});
      if (hit) return hit;
      if (req.mode === 'navigate') {
        return (await c.match(new URL('./', self.registration.scope).href)) ||
               (await c.match(new URL('index.html', self.registration.scope).href)) ||
               Response.error();
      }
      return Response.error();
    }
  })());
});
