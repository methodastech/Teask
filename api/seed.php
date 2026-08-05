<?php

declare(strict_types=1);

/**
 * One-time setup. Open it in a browser once:
 *
 *     https://api.teask.asia/seed.php
 *
 * It creates the tables, creates the studio login from config.php, and imports
 * the articles that were previously written into the site's code.
 *
 * It only works while there is no studio account yet. Once setup has run, it
 * refuses — so there is nothing to guard, nothing to time, and no way for
 * anyone to hit this URL later and reset the client's content.
 */

ini_set('display_errors', '0');
error_reporting(E_ALL);

require_once __DIR__ . '/lib/posts.php';

header('Content-Type: text/plain; charset=utf-8');

$out = static fn(string $line) => print($line . PHP_EOL);

try {
    // ── tables ─────────────────────────────────────────────────────
    $sql = (string) file_get_contents(__DIR__ . '/schema.sql');
    // drop the -- comment lines so the split below only sees statements
    $sql = preg_replace('/^\s*--.*$/m', '', $sql) ?? '';
    foreach (array_filter(array_map('trim', explode(';', $sql))) as $statement) {
        db()->exec($statement);
    }

    // ── has this already run? ──────────────────────────────────────
    if ((int) db()->query('SELECT COUNT(*) FROM admin_users')->fetchColumn() > 0) {
        $out('Already set up. Nothing to do.');
        $out('You can delete this file from the server.');
        exit(0);
    }

    // ── the studio login ───────────────────────────────────────────
    $admin = config()['admin'];
    $email = strtolower(trim((string) ($admin['email'] ?? '')));
    $password = (string) ($admin['password'] ?? '');

    if ($email === '' || $password === '' || $password === 'CHANGE_ME_strong_password') {
        throw new RuntimeException("Fill in 'admin' email and password in config.php first.");
    }
    if (strlen($password) < 12) {
        throw new RuntimeException('That password is too short. Use at least 12 characters.');
    }

    $stmt = db()->prepare('INSERT INTO admin_users (email, password_hash, name) VALUES (?, ?, ?)');
    // only the hash is stored, so the password can be removed from config.php
    $stmt->execute([$email, password_hash($password, PASSWORD_DEFAULT), (string) ($admin['name'] ?? 'Teask Team')]);
    $out("Studio login created: $email");

    // ── the articles ───────────────────────────────────────────────
    $path = __DIR__ . '/seed/posts.json';
    $posts = is_file($path) ? json_decode((string) file_get_contents($path), true) : [];

    $imported = 0;
    foreach (is_array($posts) ? $posts : [] as $post) {
        $slug = trim((string) ($post['slug'] ?? ''));
        if ($slug === '' || find_post($slug, true) !== null) {
            continue;
        }
        $columns = post_from_json($post);
        $columns['slug'] = $slug;
        $fields = array_keys($columns);
        $stmt = db()->prepare(sprintf(
            'INSERT INTO posts (%s) VALUES (%s)',
            implode(', ', $fields),
            implode(', ', array_fill(0, count($fields), '?'))
        ));
        $stmt->execute(array_values($columns));
        $imported++;
    }
    $out("Articles imported: $imported");

    $out('');
    $out('Done. Two things to finish:');
    $out('  1. Delete this file (seed.php) from the server.');
    $out("  2. Clear the 'password' line in config.php — the login still works.");
} catch (Throwable $e) {
    http_response_code(500);
    $out('FAILED: ' . $e->getMessage());
    exit(1);
}
