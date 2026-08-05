<?php

require_once __DIR__ . '/db.php';

/** Request/response plumbing: CORS, JSON in, JSON out, bearer auth. */

/**
 * Thrown for anything the caller did wrong. index.php turns it into a JSON
 * error with the right status, so route code can just bail out.
 */
class ApiError extends RuntimeException
{
    public function __construct(string $message, public int $status = 400)
    {
        parent::__construct($message);
    }
}

/**
 * The sites allowed to call this API: whatever is in config.php, each one also
 * accepted with and without www, plus localhost for development.
 *
 * site_url takes one address or a list, because during a revamp the same API
 * legitimately serves more than one front end — the live domain, a Netlify
 * preview the client is being shown, and a developer's machine.
 */
function allowed_origins(): array
{
    $origins = ['http://localhost:5173', 'http://127.0.0.1:5173'];

    foreach ((array) (config()['site_url'] ?? []) as $configured) {
        $site = rtrim((string) $configured, '/');
        if ($site === '') {
            continue;
        }
        $origins[] = $site;
        $origins[] = str_contains($site, '://www.')
            ? str_replace('://www.', '://', $site)
            : (string) preg_replace('#://#', '://www.', $site, 1);
    }
    return $origins;
}

/**
 * Echo the caller's origin back only if it is on the allowlist. A wildcard
 * would let any site on the internet drive this API with a stolen token.
 */
function send_cors_headers(): void
{
    $allowed = [];
    try {
        $allowed = allowed_origins();
    } catch (Throwable) {
        // config.php is missing or broken; the error itself is reported by the
        // router. Send the rest of the headers so the browser can read it.
    }

    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '' && in_array($origin, $allowed, true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
    }
    // caches must not serve one origin's response to another
    header('Vary: Origin');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Max-Age: 86400');
}

function json_response(mixed $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

/** The decoded JSON request body, or [] when there is none. */
function json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === '' || $raw === false) {
        return [];
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        throw new ApiError('Request body is not valid JSON.');
    }
    return $data;
}

/**
 * The bearer token. Several Apache/CGI setups drop the Authorization header
 * before PHP sees it, so check every place it might have survived.
 */
function bearer_token(): ?string
{
    $header = $_SERVER['HTTP_AUTHORIZATION']
        ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
        ?? '';

    if ($header === '' && function_exists('apache_request_headers')) {
        foreach (apache_request_headers() as $name => $value) {
            if (strcasecmp($name, 'Authorization') === 0) {
                $header = $value;
                break;
            }
        }
    }

    if (preg_match('/^Bearer\s+(.+)$/i', trim($header), $m) === 1) {
        return trim($m[1]);
    }
    return null;
}

/** The signed-in user for this request, or null. */
function current_user(): ?array
{
    static $resolved = false;
    static $user = null;

    if ($resolved) {
        return $user;
    }
    $resolved = true;

    $token = bearer_token();
    if ($token === null) {
        return null;
    }

    $stmt = db()->prepare(
        'SELECT u.id, u.email, u.name
           FROM admin_sessions s
           JOIN admin_users u ON u.id = s.user_id
          WHERE s.token_hash = ? AND s.expires_at > NOW()'
    );
    $stmt->execute([hash('sha256', $token)]);
    $row = $stmt->fetch();

    $user = $row ?: null;
    return $user;
}

/** Guard for every write route. */
function require_auth(): array
{
    $user = current_user();
    if ($user === null) {
        throw new ApiError('Sign in to do that.', 401);
    }
    return $user;
}

function require_string(array $data, string $key, int $max, bool $required = true): string
{
    $value = trim((string) ($data[$key] ?? ''));
    if ($value === '' && $required) {
        throw new ApiError(sprintf('"%s" is required.', $key));
    }
    if (mb_strlen($value) > $max) {
        throw new ApiError(sprintf('"%s" is longer than %d characters.', $key, $max));
    }
    return $value;
}
