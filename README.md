# Convocatoria ⚽ en vivo

Una sola lista por link, en vivo. Nadie copia y pega; nadie saca a nadie sin querer.

- **Empezar:** abre la página sin parámetros. Lo normal es **🔁 Cada lunes**: pones la hora del partido y queda **un solo link para siempre**. También se puede hacer un partido **📅 Una sola vez** (fecha y hora). Te lleva a tu **link de admin** (guárdalo).
- **Semana a semana:** el partido del lunes aparece solo y la lista **se abre cada miércoles a la 1:00 PM** (hora de quien creó el grupo). Antes de esa hora nadie puede apuntarse (lo hacen cumplir las reglas con la hora del servidor). 3 h después del partido ya se muestra el del lunes siguiente.
- **Partido extra:** el admin lo crea desde su link (fecha, hora y cupos opcionales). Sale como otra pestaña ⭐ en el mismo link, abierto de inmediato.
- **Compartir:** "Enviar al grupo" manda la lista por WhatsApp con el link normal.
- **Apuntarse:** cada uno abre el link, pone su nombre (marca arquero si aplica) y listo. Para un invitado, se pone "de quién es".
- **Orden automático:** primero los del grupo por orden de llegada (hora del servidor) y después los invitados. Los que pasen del cupo quedan como suplentes. Los 2 primeros puestos son solo para arqueros (quedan libres si no hay); los demás arqueros esperan en una fila aparte y suben si un arquero titular se baja.
- **Bajarse:** botón "Bajarme" (solo desde el mismo celular con que te apuntaste). Las bajas son **públicas**: todos ven "👋 Se bajaron" con nombre, fecha y hora. El primer suplente sube solo.
- **Suplente que sube:** tiene que **reconfirmar** ("✅ Voy" / "No puedo"). Mientras tanto sale "⏳ por confirmar". Si no puede, suelta el cupo **sin multa**.
- **Multa 🍺:** bajarse **el mismo día del partido** (el lunes, o el día del extra) son **3 cervezas**. Las multas son **públicas** ("🍺 Deben cervezas") y quien debe no puede volver a apuntarse (por nombre, o por celular si se apunta a sí mismo) hasta que el admin toque **Pagó**. Aplica a quien se baja, invitado incluido; bajarse otro día no tiene castigo. Si el admin saca a alguien ese día también cuenta (lo puede perdonar con Pagó). Las multas no se guardan aparte: salen de la historia de bajas (que no se puede borrar) menos las marcadas en `pagos`. El bloqueo se hace en la página (las reglas no pueden normalizar nombres).
- **Admin:** con el link de admin puede sacar a cualquiera, crear partidos extra y marcar multas pagadas.
- **Sin cuentas:** usa una sesión anónima e invisible de Firebase por dispositivo.

## Avisos (Web Push)

Cada alta, baja, invitado o suplente que sube le llega como notificación a quien tocó "🔔 Activar avisos". Reemplaza el copiar/pegar en el grupo.

- **iPhone:** solo funciona con la página instalada ("Compartir → Agregar a pantalla de inicio", iOS 16.4+). La tarjeta de avisos guía ese paso. La app instalada no comparte sesión con Safari: desde ahí hay que apuntarse de nuevo.
- **Por grupo:** en el grupo semanal los avisos se activan una vez y sirven para todas las semanas y partidos extra; cada aviso dice de qué partido es. En un partido de una sola vez son solo de ese partido.
- **Bajas:** el aviso trae la hora y, si fue el día del partido, "🍺 debe 3 cervezas". Cada cambio se avisa una sola vez (marca por partido en `notif/`), aunque se llame al servidor de más.
- **Servidor:** `api/avisos.js` (función de Vercel + `firebase-admin` + `web-push`) arma el aviso leyendo la base y crea el partido de cada lunes (con su hora de apertura) cuando alguien abre el link. `subs/` y `notif/` no tienen reglas: solo el servidor las toca.
- **Variables de entorno en Vercel:** `VAPID_PUBLIC`, `VAPID_PRIVATE` (`npx web-push generate-vapid-keys`; la pública también va en `index.html`) y `FIREBASE_SA` (JSON de la cuenta de servicio: Firebase → Configuración → Cuentas de servicio → Generar clave).

## En producción

- App: https://futbol-convo.vercel.app (proyecto Vercel `futbol-convo`)
- Firebase: proyecto `futbolconvocatoria` (Realtime Database + acceso anónimo)
- Publicar cambios: push a GitHub (Vercel está enlazado): una rama = preview, `main` = producción. La preview y producción usan la **misma** base de Firebase.
- Cambiar reglas: `npx firebase-tools deploy --only database`

## Setup desde cero (~5 min)

1. Entra a https://console.firebase.google.com y usa **Agregar proyecto** (puedes desactivar Analytics).
2. **Authentication → Comenzar → Método de acceso → Anónimo → Habilitar.**
3. **Realtime Database → Crear base de datos** (en modo bloqueado). En la pestaña **Reglas**, pega el contenido de `database.rules.json` y dale a **Publicar**.
4. **Configuración del proyecto → Tus apps → Web `</>`**. Registra la app y copia el `firebaseConfig` en `index.html`, reemplazando el objeto vacío. Revisa que tenga `databaseURL`.
5. Publica la carpeta:
   - **GitHub Pages:** sube el repo y ve a Settings → Pages → Deploy from branch `main` / root.
   - **Vercel:** `npx vercel --prod` dentro de la carpeta.
6. (Si Firebase se queja de dominio) Authentication → Configuración → **Dominios autorizados**: agrega `tuusuario.github.io` o `tu-app.vercel.app`.

## Local

```
npx serve .        # los módulos ES no funcionan con file://
node lista.test.mjs
```

## Archivos

- `index.html`: toda la app.
- `lista.js`: orden, suplentes, reconfirmación, texto para WhatsApp, semana del lunes, multas y diff de cambios para los avisos (funciones puras).
- `api/avisos.js`, `sw.js`, `manifest.webmanifest`: avisos push.
- `lista.test.mjs`: verificación de esa lógica.
- `database.rules.json`: seguridad. Cada uno solo puede bajarse a sí mismo, nadie puede adelantarse falseando la hora ni apuntarse antes de que abra la lista, nadie puede borrar filas ni convocatorias, y solo el admin crea partidos extra y marca multas pagadas. Ya no hay limpieza automática: los grupos viven para siempre.

## Datos

```
convos/{c}: { title, place, cupo, createdAt,
  hora, tz,                     // grupo semanal
  partidos/{pid}: { when, abre, cupo?, extra?, players/{p} },  // pid = '2026-10-26' (lunes) o 'x…' (extra)
  pagos/{pid~p}: true,
  when, players/{p} }           // partido de una sola vez
players/{p}: { name, uid, ts, arq?, guestOf?, out?, conf?, sube? }
```
