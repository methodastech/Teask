<?php

require_once __DIR__ . '/../lib/http.php';

/**
 * /auth — studio sign-in.
 *
 *   POST /auth/login    { email, password } → { token, user }
 *   POST /auth/logout   ends the current token
 *   GET  /auth/me       who the token belongs to
 *
 * The browser keeps the token and sends it as `Authorization: Bearer …`.
 * A cookie would be cleaner, but the studio and the API sit on different
 * hosts, and cross-site cookies are more fragile than they are worth here.
 */
/** how many failed sign-ins one address may make, and over what window */
const LOGIN_MAX_FAILURES = 8;
const LOGIN_WINDOW_MINUTES = 15;

/** how long a studio login lasts before it has to be repeated */
const SESSION_DAYS = 7;

/**
 * The caller's address. Deliberately REMOTE_ADDR and not X-Forwarded-For:
 * that header is caller-supplied, so trusting it would let an attacker reset
 * their own rate limit by inventing a new address on every request.
 */
function client_ip(): string
{
    return substr((string) ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'), 0, 45);
}

function handle_auth(string $method, array $segments): never
{
    $action = $segments[1] ?? '';

    if ($method === 'POST' && $action === 'login') {
        $body = json_body();
        $email = strtolower(require_string($body, 'email', 191));
        $password = (string) ($body['password'] ?? '');
        $ip = client_ip();

        db()->exec('DELETE FROM login_attempts WHERE attempted_at < DATE_SUB(NOW(), INTERVAL 1 HOUR)');

        $stmt = db()->prepare(
            'SELECT COUNT(*) FROM login_attempts
              WHERE ip = ? AND attempted_at > DATE_SUB(NOW(), INTERVAL ? MINUTE)'
        );
        $stmt->execute([$ip, LOGIN_WINDOW_MINUTES]);
        if ((int) $stmt->fetchColumn() >= LOGIN_MAX_FAILURES) {
            throw new ApiError(
                sprintf('Too many sign-in attempts. Try again in %d minutes.', LOGIN_WINDOW_MINUTES),
                429
            );
        }

        $stmt = db()->prepare('SELECT id, email, name, password_hash FROM admin_users WHERE email = ?');
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        // one message for both failures: telling an attacker which half was
        // wrong hands them a list of valid accounts
        if ($user === false || !password_verify($password, $user['password_hash'])) {
            $stmt = db()->prepare('INSERT INTO login_attempts (ip, email) VALUES (?, ?)');
            $stmt->execute([$ip, $email]);
            throw new ApiError('Those credentials do not match an account.', 401);
        }

        // a good password clears this address's record, so a team member who
        // mistyped twice is not still counting down afterwards
        $stmt = db()->prepare('DELETE FROM login_attempts WHERE ip = ?');
        $stmt->execute([$ip]);

        // opportunistic sweep, so expired rows do not accumulate forever
        db()->exec('DELETE FROM admin_sessions WHERE expires_at < NOW()');

        $token = bin2hex(random_bytes(32));
        $stmt = db()->prepare(
            'INSERT INTO admin_sessions (token_hash, user_id, expires_at)
             VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))'
        );
        $stmt->execute([hash('sha256', $token), $user['id'], SESSION_DAYS]);

        // the token must not sit in a proxy or browser cache
        header('Cache-Control: no-store');
        json_response([
            'token' => $token,
            'user'  => ['email' => $user['email'], 'name' => $user['name']],
        ]);
    }

    if ($method === 'POST' && $action === 'logout') {
        $token = bearer_token();
        if ($token !== null) {
            $stmt = db()->prepare('DELETE FROM admin_sessions WHERE token_hash = ?');
            $stmt->execute([hash('sha256', $token)]);
        }
        json_response(['ok' => true]);
    }

    if ($method === 'GET' && $action === 'me') {
        $user = require_auth();
        json_response(['user' => ['email' => $user['email'], 'name' => $user['name']]]);
    }

    throw new ApiError('Unknown auth route.', 404);
}
