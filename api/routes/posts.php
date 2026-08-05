<?php

require_once __DIR__ . '/../lib/posts.php';

/**
 * /posts — the content the Resources page reads and the studio writes.
 *
 *   GET    /posts             every published item, newest first
 *                             (?status=all also returns drafts, signed in only)
 *   GET    /posts/{slug}      one item
 *   POST   /posts             create              (signed in)
 *   PUT    /posts/{slug}      update              (signed in)
 *   DELETE /posts/{slug}      delete              (signed in)
 */
function handle_posts(string $method, array $segments): never
{
    $slug = $segments[1] ?? null;

    if ($method === 'GET' && $slug === null) {
        // drafts are only visible to someone signed in, whatever they ask for
        $wantAll = ($_GET['status'] ?? '') === 'all' && current_user() !== null;
        $sql = 'SELECT * FROM posts';
        if (!$wantAll) {
            $sql .= " WHERE status = 'published'";
        }
        $sql .= ' ORDER BY published_at DESC, id DESC';
        $rows = db()->query($sql)->fetchAll();
        json_response(['posts' => array_map('post_to_json', $rows)]);
    }

    if ($method === 'GET') {
        $row = find_post($slug, current_user() !== null);
        if ($row === null) {
            throw new ApiError('No article with that address.', 404);
        }
        json_response(['post' => post_to_json($row)]);
    }

    if ($method === 'POST' && $slug === null) {
        require_auth();
        $body = json_body();
        $columns = post_from_json($body);

        // the client may suggest a slug, but the server decides — it owns
        // uniqueness, and the slug is the article's permanent address
        $requested = trim((string) ($body['slug'] ?? ''));
        $columns['slug'] = unique_slug(slugify($requested !== '' ? $requested : $columns['title']));

        $fields = array_keys($columns);
        $stmt = db()->prepare(sprintf(
            'INSERT INTO posts (%s) VALUES (%s)',
            implode(', ', $fields),
            implode(', ', array_fill(0, count($fields), '?'))
        ));
        $stmt->execute(array_values($columns));

        json_response(['post' => post_to_json(find_post($columns['slug'], true))], 201);
    }

    if ($method === 'PUT' && $slug !== null) {
        require_auth();
        if (find_post($slug, true) === null) {
            throw new ApiError('No article with that address.', 404);
        }

        $body = json_body();
        $columns = post_from_json($body);

        // retitling moves the article's URL; keep the old one unless the
        // caller explicitly sends a different slug
        $requested = trim((string) ($body['slug'] ?? ''));
        $columns['slug'] = ($requested === '' || $requested === $slug)
            ? $slug
            : unique_slug(slugify($requested), $slug);

        $assignments = implode(', ', array_map(static fn($f) => "$f = ?", array_keys($columns)));
        $stmt = db()->prepare("UPDATE posts SET $assignments WHERE slug = ?");
        $stmt->execute([...array_values($columns), $slug]);

        json_response(['post' => post_to_json(find_post($columns['slug'], true))]);
    }

    if ($method === 'DELETE' && $slug !== null) {
        require_auth();
        $stmt = db()->prepare('DELETE FROM posts WHERE slug = ?');
        $stmt->execute([$slug]);
        if ($stmt->rowCount() === 0) {
            throw new ApiError('No article with that address.', 404);
        }
        json_response(['ok' => true]);
    }

    throw new ApiError('That method is not allowed here.', 405);
}
