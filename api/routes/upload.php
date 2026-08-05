<?php

require_once __DIR__ . '/../lib/http.php';

/**
 * POST /upload — a cover image, sent as multipart/form-data under "file".
 * Returns { url } to store in posts.cover.
 *
 * Images go on disk, not in the database: a base64 cover in a LONGTEXT column
 * makes every listing query drag megabytes around for no reason.
 */

const UPLOAD_MAX_BYTES = 5 * 1024 * 1024;

// extension is chosen from the sniffed type, never from the uploaded filename
const UPLOAD_TYPES = [
    'image/jpeg' => 'jpg',
    'image/png'  => 'png',
    'image/webp' => 'webp',
    'image/gif'  => 'gif',
    'image/avif' => 'avif',
];

/**
 * Where uploads are served from, worked out from the request rather than
 * configured. One less value to fill in, and one less way to get a broken
 * image URL by putting the wrong domain in a file.
 */
function uploads_url(): string
{
    $https = ($_SERVER['HTTPS'] ?? 'off') !== 'off'
        || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
    $host = (string) ($_SERVER['HTTP_HOST'] ?? 'localhost');
    $base = rtrim(str_replace('\\', '/', dirname((string) ($_SERVER['SCRIPT_NAME'] ?? ''))), '/');

    return sprintf('%s://%s%s/uploads', $https ? 'https' : 'http', $host, $base);
}

function handle_upload(string $method): never
{
    if ($method !== 'POST') {
        throw new ApiError('That method is not allowed here.', 405);
    }
    require_auth();

    $file = $_FILES['file'] ?? null;
    if ($file === null || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        // the common case is a file larger than PHP's own upload_max_filesize,
        // which arrives as an error rather than as data
        throw new ApiError('No file arrived, or it was larger than the server allows.');
    }
    if ($file['size'] > UPLOAD_MAX_BYTES) {
        throw new ApiError('That image is larger than 5 MB.');
    }
    if (!is_uploaded_file($file['tmp_name'])) {
        throw new ApiError('That upload could not be verified.');
    }

    $info = @getimagesize($file['tmp_name']);
    $mime = $info['mime'] ?? '';
    if (!isset(UPLOAD_TYPES[$mime])) {
        throw new ApiError('Only JPG, PNG, WebP, GIF and AVIF images are accepted.');
    }

    $dir = __DIR__ . '/../uploads';
    if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
        throw new ApiError('The uploads folder does not exist and could not be created.', 500);
    }

    $name = date('Y-m') . '-' . bin2hex(random_bytes(8)) . '.' . UPLOAD_TYPES[$mime];
    if (!move_uploaded_file($file['tmp_name'], $dir . '/' . $name)) {
        throw new ApiError('The image could not be saved.', 500);
    }

    json_response(['url' => uploads_url() . '/' . $name], 201);
}
