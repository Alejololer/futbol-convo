// Única función del servidor: guarda suscripciones push y avisa los cambios de la lista.
// Los avisos se arman leyendo la base (nunca con lo que manda el cliente), así que llamarla de más no hace spam.
import { createHash } from 'node:crypto';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import webpush from 'web-push';
import { cambios, marca, semana } from '../lista.js';

const MAX_SUBS = 300;
// Solo servicios push reales: evita que alguien registre una URL cualquiera y use el servidor para pegarle.
const PUSH_HOST = /^https:\/\/(fcm\.googleapis\.com|([\w-]+\.)*push\.apple\.com|([\w-]+\.)*push\.services\.mozilla\.com|([\w-]+\.)*notify\.windows\.com)\//;
const ID = /^[\w-]{1,40}$/;

const app = getApps()[0] || initializeApp({
  credential: cert(JSON.parse(process.env.FIREBASE_SA)),
  databaseURL: 'https://futbolconvocatoria-default-rtdb.firebaseio.com',
});
const db = getDatabase(app);
webpush.setVapidDetails('mailto:avisos@futbol-convo.vercel.app', process.env.VAPID_PUBLIC, process.env.VAPID_PRIVATE);

const val = async path => (await db.ref(path).get()).val();
const hash = endpoint => createHash('sha256').update(endpoint).digest('hex').slice(0, 16);

async function enviar(c, payload) {
  const subs = (await val(`subs/${c}`)) || {};
  const gone = {};
  await Promise.all(Object.entries(subs).map(async ([k, sub]) => {
    try { await webpush.sendNotification(sub, JSON.stringify(payload), { TTL: 86400 }); }
    catch (e) { if (e.statusCode === 404 || e.statusCode === 410) gone[`subs/${c}/${k}`] = null; }
  }));
  if (Object.keys(gone).length) await db.ref().update(gone);
}

const acciones = {
  async sub({ c, sub }) {
    const ok = sub?.endpoint && PUSH_HOST.test(sub.endpoint) && sub.keys?.p256dh && sub.keys?.auth;
    if (!ok || !(await val(`convos/${c}/cupo`))) return 400;
    const actuales = (await val(`subs/${c}`)) || {};
    const k = hash(sub.endpoint);
    if (!actuales[k] && Object.keys(actuales).length >= MAX_SUBS) return 429;
    const { endpoint, keys: { p256dh, auth } } = sub;
    // Marca inicial: a quien se suscribe solo le avisamos lo que pase desde ahora.
    const players = await val(`convos/${c}/players`);
    await db.ref(`notif/${c}`).transaction(cur => cur ?? marca(players));
    await db.ref(`subs/${c}/${k}`).set({ endpoint, keys: { p256dh, auth } });
  },

  async unsub({ c, endpoint }) {
    if (typeof endpoint === 'string') await db.ref(`subs/${c}/${hash(endpoint)}`).remove();
  },

  // Grupo semanal: crea el partido del lunes que toca (con su hora de apertura). Idempotente: lo llama cada visita.
  async semana({ c }) {
    const [hora, tz] = await Promise.all([val(`convos/${c}/hora`), val(`convos/${c}/tz`)]);
    if (!hora) return 404;
    const s = semana(Date.now(), tz, hora);
    await db.ref(`convos/${c}/partidos/${s.pid}`).transaction(cur => cur === null ? { when: s.when, abre: s.abre } : undefined);
  },

  // p = partido del grupo; sin p = partido único (la convocatoria misma).
  async notify({ c, p }) {
    if (p != null && !ID.test(p)) return 400;
    const convo = await val(`convos/${c}`);
    const pa = p ? convo?.partidos?.[p] : convo;
    if (!pa) return 404;
    const cupo = pa.cupo || convo.cupo;
    let desde;
    const hasta = marca(pa.players);
    const res = await db.ref(`notif/${p ? `${c}~${p}` : c}`).transaction(cur => { desde = cur; return cur == null || cur < hasta ? hasta : undefined; });
    if (!res.committed || (desde == null && !p)) return; // nada nuevo u otro aviso ya lo cubrió: cada cambio se avisa una sola vez
    const r = cambios(pa.players, cupo, desde || 0, p && { tz: convo.tz, when: pa.when });
    if (!r.lineas.length) return;
    const falta = cupo - r.titulares;
    const fecha = p ? ` · ${pa.extra ? '⭐ ' : ''}${new Date(pa.when + 'Z').toLocaleDateString('es', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' })}` : '';
    await enviar(c, {
      title: `${convo.title}${fecha} · ${r.titulares}/${cupo}${falta > 0 ? ` · faltan ${falta}` : ' · ¡completo!'}`,
      body: r.lineas.join('\n'),
      url: `/?c=${c}${p ? `&p=${p}` : ''}&n=1`,
    });
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    if (!ID.test(b.c) || !acciones[b.accion]) return res.status(400).end();
    res.status((await acciones[b.accion](b)) || 204).end();
  } catch (e) {
    console.error(e);
    res.status(500).end();
  }
}
