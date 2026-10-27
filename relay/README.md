# Quruvchi sherik API relay (alohida xizmat)

Bu xizmat turli kompyuterlardagi localhost Quruvchi instansiyalarini bog‘lash uchun sheriklik kodi, tasdiqlash/bekor qilish va so‘rovlar navbatini beradi. Relay Anthropic API kalitini qabul qilmaydi yoki saqlamaydi. API egasining kompyuteridagi worker so‘rovni olib, egasining `.env` kaliti bilan providerga yuborishi kerak.

## Hozirgi holat

`relay/server.js` sheriklik protokolining backend skeletidir. U hali Quruvchi chat UI yoki mahalliy Claude client/worker bilan ulanmagan. Shu sabab uni ishga tushirishning o‘zi API-key xatosini tuzatmaydi; chat so‘rovlarini relayga yo‘naltiradigan worker/client integratsiyasi va UI hali bajarilishi kerak.

## Ishga tushirish

Node.js 22.13+ kerak (`node:sqlite`).

```powershell
$env:PORT="8787"
$env:DATA_DIR="./data"
$env:SHARE_DAILY_REQUEST_LIMIT="100"
node --experimental-sqlite relay/server.js
```

Tekshirish: `GET /healthz`.

Deploy qilganda HTTPS, doimiy disk, reverse proxy/firewall, abuse monitoring va zaxira nusxa kerak. Owner va sherik tokenlari maxfiy credential hisoblanadi.

## API protokoli

- `POST /v1/owners/register` — owner token yaratadi.
- `POST /v1/invites` — 10 daqiqalik bir martalik kod.
- `POST /v1/pair` — kodni qabul qiladi; sherik `pending` holatda turadi.
- `GET /v1/partners` — sheriklar ro‘yxati.
- `POST /v1/partners/:id/approve` yoki `/revoke` — egasi ruxsat beradi yoki bekor qiladi.
- `POST /v1/requests` — faol sherik so‘rovni navbatga qo‘yadi.
- `GET /v1/owner/jobs` — owner worker navbatni oladi.
- `POST /v1/owner/jobs/:id/result` — worker natijani qaytaradi.
- `GET /v1/requests/:id` — sherik natijani tekshiradi.

Worker faqat API egasining o‘z kompyuterida ishlashi kerak. Relayga API key yoki provider authorization header yubormang. Worker offline bo‘lsa, so‘rov bajarilmaydi.

## Production cheklovlari

Bu boshlang‘ich protokol skeleti. Internetga ochiq production foydalanishdan oldin worker/Claude adapter integratsiyasi, browser origin allowlist, request rate limit, monitoring va to‘liq testlar zarur. Relayni ishga tushirishning o‘zi Quruvchi UI’ga API sharing funksiyasini avtomatik qo‘shmaydi.