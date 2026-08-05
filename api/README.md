# Teask content API

Lets the studio at `/admin` publish articles that every visitor sees, instead of
only the browser that wrote them.

A browser cannot open a MySQL connection, so this small PHP service sits in
between and holds the database credentials:

```
Browser (React)  ──▶  this API  ──▶  MySQL
```

Needs **PHP 8.1+** (cPanel → MultiPHP Manager).

---

## Setup — six steps, once

**1. Database.** cPanel → MySQL® Databases. Create a database, create a user
with a generated password, and add the user to the database with ALL
PRIVILEGES. Make a **new** one — do not reuse the live site's database or user.

**2. Subdomain.** cPanel → Domains → Create A New Domain: `api.teask.asia`,
document root `api.teask.asia` (outside `public_html`). Then cPanel → SSL/TLS
Status and run AutoSSL for it. HTTPS is required.

**3. Upload.** Put the contents of this folder into that document root, so
`index.php` sits at the top of `api.teask.asia`.

**4. Configure.** Copy `config.sample.php` to `config.php` and fill in four
things: the database name, user and password from step 1, and the studio
password you want the client to use.

**5. Run setup.** Open `https://api.teask.asia/seed.php` in a browser. It
creates the tables, creates the studio login, and imports the existing
articles. It only works once — after that it refuses, so nobody can hit that
URL later and reset anything.

Then do the two things it tells you: delete `seed.php`, and clear the
`password` line in `config.php`. The login keeps working, because only the
hashed form was stored.

**6. Point the site at it.** In the project root, copy `.env.example` to
`.env.local` and set:

```
VITE_API_URL=https://api.teask.asia
```

Rebuild (`npm run build`) and deploy `dist/` to `public_html`.

**Check:** open `https://api.teask.asia/posts` — you should see the articles as
JSON. Then sign in at `/admin`, publish something, and look at `/resources`.

---

## After that, the client just uses it

They sign in at `teask.asia/admin` with the email and password from step 4, and
write. Nothing else here needs touching.

Everything below is reference — not setup.

---

## The live site is untouched

| | Live site | This |
|---|---|---|
| Database | the existing one | a new one |
| Database user | existing | a new one, this database only |
| Files | `public_html/` | `api.teask.asia/` |

Creating a database, user or subdomain never modifies an existing one. At
cutover you replace the files in `public_html`; the database and API are
already live by then, and the old database is untouched if you need to go back.

## Routes

| Method | Path | Auth | |
|---|---|---|---|
| `GET` | `/posts` | — | everything published |
| `GET` | `/posts/{slug}` | — | one item |
| `POST` | `/posts` | yes | create |
| `PUT` | `/posts/{slug}` | yes | update |
| `DELETE` | `/posts/{slug}` | yes | delete |
| `POST` | `/upload` | yes | multipart `file` → `{ url }` |
| `POST` | `/auth/login` | — | `{ email, password }` → `{ token, user }` |
| `POST` | `/auth/logout` | yes | |
| `GET` | `/auth/me` | yes | |

Authenticated calls send `Authorization: Bearer <token>`. Errors return
`{ "error": "..." }`. Post JSON matches the `Post` interface in
`src/lib/posts.ts` exactly, so the front end uses a response as-is.

## Security

- Passwords are bcrypt hashes; the password itself is never stored.
- Sessions are random tokens, stored only as SHA-256, expiring after 7 days.
- Failed sign-ins are capped at 8 per IP per 15 minutes (`login_attempts`).
- Uploads go to disk with a `.htaccess` that stops anything there executing.
- `/admin` is ordinary JavaScript and anyone can load it. What protects it is
  this API refusing every write without a valid token — so what matters is a
  strong password, HTTPS, and `config.php` not leaking.

To change the studio password later, replace `admin_users.password_hash` in
phpMyAdmin with the output of, in cPanel → Terminal:
`php -r 'echo password_hash("new-password", PASSWORD_DEFAULT);'`

## Front-end deployment

`public/.htaccess` ships in the build and gives Apache the rewrite React Router
needs. Without it, opening `teask.asia/resources/some-article` directly returns
a 404 before the app loads.

If the articles in `src/lib/posts.ts` ever change and need re-importing, run
`npm run seed:export` from the project root first.
