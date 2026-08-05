<?php

declare(strict_types=1);

/**
 * Front controller. .htaccess sends every request here; this file works out
 * which route it is and hands off.
 *
 * Errors never reach the browser as HTML — a PHP notice printed into a JSON
 * response is the single most confusing failure mode for the front end, so
 * display_errors is off and everything leaves as JSON.
 */

ini_set('display_errors', '0');
error_reporting(E_ALL);

require_once __DIR__ . '/lib/http.php';
require_once __DIR__ . '/routes/auth.php';
require_once __DIR__ . '/routes/posts.php';
require_once __DIR__ . '/routes/upload.php';

send_cors_headers();
// responses are JSON; never let a browser guess otherwise and run one
header('X-Content-Type-Options: nosniff');

// preflight: the browser is only asking whether the real call is allowed
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

/**
 * The path after this script, whether the API sits at a subdomain root
 * (/posts) or inside a folder (/api/posts).
 */
function request_segments(): array
{
    $path = (string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
    $base = rtrim(str_replace('\\', '/', dirname((string) ($_SERVER['SCRIPT_NAME'] ?? ''))), '/');
    if ($base !== '' && str_starts_with($path, $base)) {
        $path = substr($path, strlen($base));
    }
    return array_values(array_filter(explode('/', trim($path, '/')), static fn($s) => $s !== ''));
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$segments = request_segments();

try {
    match ($segments[0] ?? '') {
        // a plain GET of the API root, handy for checking the deploy is live
        ''        => json_response(['name' => 'Teask content API', 'ok' => true]),
        'auth'    => handle_auth($method, $segments),
        'posts'   => handle_posts($method, $segments),
        'upload'  => handle_upload($method),
        default   => throw new ApiError('Unknown route.', 404),
    };
} catch (ApiError $e) {
    json_response(['error' => $e->getMessage()], $e->status);
} catch (PDOException $e) {
    // by far the most common cause is setup: wrong credentials in config.php,
    // or schema.sql never run. Name the two without echoing the driver message.
    error_log('[teask-api] db: ' . $e->getMessage());
    json_response(
        ['error' => 'The database could not be reached. Check config.php, and that schema.sql has been run.'],
        500,
    );
} catch (Throwable $e) {
    // log the detail for us, return something safe to the caller
    error_log('[teask-api] ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    json_response(['error' => 'Something went wrong on the server.'], 500);
}
