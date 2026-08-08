<?php
declare(strict_types=1);

/**
 * Contact form endpoint · Teask
 * ─────────────────────────────
 * Accepts the JSON POST that ContactPage.tsx sends and emails it on. Written for
 * GoDaddy cPanel Linux hosting (Apache + PHP), which is why it uses PHP's own
 * mail() rather than an SMTP library: there is nothing to install and no
 * credentials to store.
 *
 * It lives in `public/api/` so that Vite copies it verbatim into `dist/api/`.
 * That matters for the deploy: uploading the contents of dist/ to public_html
 * carries the endpoint with it, and the front end can therefore call it at the
 * relative path /contact.php with no CORS involved, because it is the same
 * origin as the site.
 *
 * DELIVERABILITY, the part that actually bites:
 *
 *   `From` MUST be an address on this domain. The obvious-looking choice — put
 *   the visitor's address in From so replies work — is what gets the mail
 *   binned. Receiving servers check whether the sending machine is authorised to
 *   send for the From domain (SPF), and this server is not authorised to send as
 *   gmail.com. The visitor's address belongs in Reply-To, which is not checked
 *   and which Reply still honours.
 *
 * If mail does not arrive, the cause is almost always DNS rather than this file:
 * teask.asia needs an SPF record covering GoDaddy's mail servers. Failing that,
 * swap mail() for authenticated SMTP through a real mailbox on the domain — and
 * if you do, put the password in an env var or a file OUTSIDE public_html, never
 * in here.
 */

// ── configuration ────────────────────────────────────────────────────────────

/** where enquiries land */
const MAIL_TO = 'kiu@teask.asia';

/**
 * The envelope sender. Must exist on this domain, or at least be on it — see the
 * deliverability note above. It never receives anything; replies go to Reply-To.
 */
const MAIL_FROM = 'noreply@teask.asia';

/** submissions allowed per IP per hour, a brake on bots rather than a firewall */
const RATE_LIMIT = 8;
const RATE_WINDOW = 3600;

/** field length caps, so a bot cannot post a megabyte of link spam */
const MAX = ['name' => 120, 'organisation' => 160, 'email' => 200, 'message' => 5000, 'purpose' => 80];

// ── plumbing ─────────────────────────────────────────────────────────────────

header('Content-Type: application/json; charset=utf-8');
// this endpoint is same-origin with the site, so it needs no CORS headers at all.
// Their absence is what stops other sites posting through it.

/** reply and stop */
function out(int $code, array $body): never
{
    http_response_code($code);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    out(405, ['ok' => false, 'error' => 'Method not allowed']);
}

$raw = file_get_contents('php://input');
if ($raw === false || $raw === '' || strlen($raw) > 64 * 1024) {
    out(400, ['ok' => false, 'error' => 'Empty or oversized request']);
}

$data = json_decode($raw, true);
if (!is_array($data)) {
    out(400, ['ok' => false, 'error' => 'Expected a JSON object']);
}

/**
 * Strip CR and LF from anything destined for a mail HEADER.
 *
 * This is the one genuinely dangerous input in the whole file. A newline inside
 * a header lets an attacker append headers of their own — a Bcc to a mailing
 * list, most commonly — and turn the form into an open relay. Stripped, not
 * escaped: there is no legitimate newline in a name or a subject.
 */
function header_safe(string $s): string
{
    return trim(str_replace(["\r", "\n", "\0"], ' ', $s));
}

/** collapse to a plain trimmed string, whatever JSON handed us */
function field(array $d, string $k, int $max): string
{
    $v = $d[$k] ?? '';
    if (!is_scalar($v)) {
        return '';
    }
    $v = trim((string) $v);
    // mb_substr so a cap never slices a multi-byte character in half
    return function_exists('mb_substr') ? mb_substr($v, 0, $max) : substr($v, 0, $max);
}

// ── the honeypot ─────────────────────────────────────────────────────────────
// A field hidden from people and irresistible to form-filling bots. Anything in
// it means a script, so accept the request and do nothing — reporting the
// rejection would just tell the author how to get past it next time.
if (field($data, 'website', 200) !== '') {
    out(200, ['ok' => true]);
}

// ── validation ───────────────────────────────────────────────────────────────

$purpose      = field($data, 'purpose', MAX['purpose']);
$name         = field($data, 'name', MAX['name']);
$organisation = field($data, 'organisation', MAX['organisation']);
$email        = field($data, 'email', MAX['email']);
$message      = field($data, 'message', MAX['message']);

$errors = [];
if ($name === '') {
    $errors[] = 'name';
}
if ($message === '') {
    $errors[] = 'message';
}
if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors[] = 'email';
}
if ($errors) {
    out(422, ['ok' => false, 'error' => 'Please check the form', 'fields' => $errors]);
}

// ── rate limit ───────────────────────────────────────────────────────────────
// Per IP, in a temp file. Crude, and deliberately so: a shared host gives us no
// database to lean on, and the job here is only to stop one script hammering the
// form. It fails open — if the filesystem misbehaves, a real enquiry still sends.
$ip = (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
$bucket = sys_get_temp_dir() . '/teask_contact_' . hash('sha256', $ip) . '.txt';
$hits = [];
$now = time();
if (is_readable($bucket)) {
    $prev = @file_get_contents($bucket);
    if ($prev !== false) {
        foreach (explode(',', $prev) as $t) {
            $t = (int) $t;
            if ($t > $now - RATE_WINDOW) {
                $hits[] = $t;
            }
        }
    }
}
if (count($hits) >= RATE_LIMIT) {
    out(429, ['ok' => false, 'error' => 'Too many messages from this address. Please email us directly.']);
}
$hits[] = $now;
@file_put_contents($bucket, implode(',', $hits), LOCK_EX);

// ── compose ──────────────────────────────────────────────────────────────────

$subjectText = sprintf('[Teask] %s · %s', $purpose !== '' ? $purpose : 'Enquiry', $name);
/**
 * RFC 2047 encode the subject. Names carry accents and the site serves Malaysia;
 * a raw 8-bit subject line arrives as mojibake in plenty of mail clients.
 */
$subject = '=?UTF-8?B?' . base64_encode(header_safe($subjectText)) . '?=';

$lines = [
    'Purpose:      ' . ($purpose !== '' ? $purpose : '(not given)'),
    'Name:         ' . $name,
    'Organisation: ' . ($organisation !== '' ? $organisation : '(not given)'),
    'Email:        ' . $email,
    '',
    '--- Message ---',
    '',
    $message,
    '',
    '---',
    'Sent from the teask.asia contact form',
    'Received:     ' . gmdate('Y-m-d H:i:s') . ' UTC',
    'Visitor IP:   ' . $ip,
];
// normalise to CRLF; some MTAs mangle bare LF in the body
$body = str_replace(["\r\n", "\r", "\n"], "\r\n", implode("\n", $lines));

$headers = [
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    // display name encoded for the same reason as the subject
    'From: =?UTF-8?B?' . base64_encode('Teask website') . '?= <' . MAIL_FROM . '>',
    'Reply-To: ' . header_safe($name) . ' <' . header_safe($email) . '>',
    'X-Mailer: teask-contact',
];

// -f sets the envelope sender, which is what SPF is actually checked against —
// the From header alone is not enough on most shared hosts.
$sent = @mail(MAIL_TO, $subject, $body, implode("\r\n", $headers), '-f' . MAIL_FROM);

if (!$sent) {
    // Say so honestly. The front end shows its own error state with the direct
    // email address in it, which is the right outcome — far better than a
    // thank-you screen for a message that never left the building.
    out(500, ['ok' => false, 'error' => 'Could not send the message. Please email us directly.']);
}

out(200, ['ok' => true]);
