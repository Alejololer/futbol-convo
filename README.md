# Convocatoria ⚽ en vivo

Una sola lista por link, en vivo. Nadie copia y pega; nadie saca a nadie sin querer.

- **Crear:** abre la página sin parámetros, llena fecha, cancha y cupos. Te lleva a tu **link de admin** (guárdalo).
- **Compartir:** "Enviar al WhatsApp" manda al grupo la lista con el link normal.
- **Apuntarse:** cada uno abre el link, pone su nombre (marca arquero si aplica) y listo. Para un invitado, se pone "de quién es".
- **Orden automático:** primero los del grupo por orden de llegada (hora del servidor) y después los invitados. Los que pasen del cupo quedan como suplentes.
- **Bajarse:** botón "Bajarme" (solo desde el mismo celular con que te apuntaste). Tu nombre queda en "Bajas" con la hora y el primer suplente sube solo.
- **Admin:** con el link de admin puede sacar a cualquiera (por ejemplo, si alguien cambió de celular).
- **Sin cuentas:** usa una sesión anónima e invisible de Firebase por dispositivo.

## Avisos (Web Push)

Cada alta, baja, invitado o suplente que sube le llega como notificación a quien tocó "🔔 Activar avisos". Reemplaza el copiar/pegar en el grupo.

- **iPhone:** solo funciona con la página instalada ("Compartir → Agregar a pantalla de inicio", iOS 16.4+). La tarjeta de avisos guía ese paso. La app instalada no comparte sesión con Safari: desde ahí hay que apuntarse de nuevo.
- **Nueva convocatoria:** al crearla desde el mismo celular de admin de la anterior, queda marcado "📣 Avisar a los suscritos de la anterior": heredan los avisos y reciben el link nuevo.
- **Servidor:** `api/avisos.js` (función de Vercel + `firebase-admin` + `web-push`) arma el aviso leyendo la base. `subs/` y `notif/` no tienen reglas: solo el servidor las toca.
- **Variables de entorno en Vercel:** `VAPID_PUBLIC`, `VAPID_PRIVATE` (`npx web-push generate-vapid-keys`; la pública también va en `index.html`) y `FIREBASE_SA` (JSON de la cuenta de servicio: Firebase → Configuración → Cuentas de servicio → Generar clave).

## En producción

- App: https://futbol-convo.vercel.app (proyecto Vercel `futbol-convo`)
- Firebase: proyecto `futbolconvocatoria` (Realtime Database + acceso anónimo)
- Publicar cambios: `vercel deploy --prod`
- Cambiar reglas: `firebase deploy --only database`

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
- `lista.js`: orden, suplentes, texto para WhatsApp y diff de cambios para los avisos (funciones puras).
- `api/avisos.js`, `sw.js`, `manifest.webmanifest`: avisos push.
- `lista.test.mjs`: verificación de esa lógica.
- `database.rules.json`: seguridad. Cada uno solo puede bajarse a sí mismo, nadie puede adelantarse falseando la hora y nadie puede borrar filas.
