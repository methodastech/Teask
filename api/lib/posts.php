<?php

require_once __DIR__ . '/http.php';

/**
 * Reading and writing posts.
 *
 * The wire shape is the front end's `Post` interface (src/lib/posts.ts)
 * exactly — camelCase, `date` not `published_at` — so the React app can use a
 * row straight from here with no adapter. All translation happens in this file.
 */

/** DB row → the JSON the front end expects. */
function post_to_json(array $row): array
{
    return [
        'kind'        => $row['kind'],
        'slug'        => $row['slug'],
        'title'       => $row['title'],
        'description' => $row['description'],
        'category'    => $row['category'],
        'date'        => $row['published_at'],
        'readMinutes' => (int) $row['read_minutes'],
        'cover'       => $row['cover'],
        'coverAlt'    => $row['cover_alt'],
        'keywords'    => json_decode($row['keywords'], true) ?: [],
        'sections'    => json_decode($row['sections'], true) ?: [],
        'status'      => $row['status'],
    ];
}

/**
 * Validate an incoming article and return DB-shaped columns.
 * Anything the caller sends that is not listed here is discarded.
 */
function post_from_json(array $data): array
{
    $kind = ($data['kind'] ?? 'article') === 'news' ? 'news' : 'article';

    $sections = $data['sections'] ?? [];
    if (!is_array($sections)) {
        throw new ApiError('"sections" must be an array.');
    }

    // keep only the fields an article section may have, and drop empties
    $clean = [];
    foreach ($sections as $section) {
        if (!is_array($section)) {
            continue;
        }

        $paragraphs = array_values(array_filter(
            array_map(static fn($p) => trim((string) $p), (array) ($section['paragraphs'] ?? [])),
            static fn($p) => $p !== ''
        ));
        $heading = trim((string) ($section['heading'] ?? ''));

        // a body image: a URL and its alt text, never inline image data
        $image = null;
        $src = trim((string) ($section['image']['src'] ?? ''));
        if ($src !== '') {
            if (str_starts_with($src, 'data:')) {
                throw new ApiError('Upload images first, then send their URLs.');
            }
            $image = [
                'src' => mb_substr($src, 0, 500),
                'alt' => mb_substr(trim((string) ($section['image']['alt'] ?? '')), 0, 500),
            ];
        }

        if ($paragraphs === [] && $heading === '' && $image === null) {
            continue;
        }

        $entry = [];
        if ($heading !== '') {
            $entry['heading'] = $heading;
            // only two levels exist; anything else means a heading
            $entry['headingLevel'] = ((int) ($section['headingLevel'] ?? 2)) === 3 ? 3 : 2;
        }
        $entry['paragraphs'] = $paragraphs;
        if ($image !== null) {
            $entry['image'] = $image;
        }
        $clean[] = $entry;
    }
    if ($clean === []) {
        throw new ApiError('An article needs at least one paragraph.');
    }

    $keywords = array_values(array_filter(
        array_map(static fn($k) => trim((string) $k), (array) ($data['keywords'] ?? [])),
        static fn($k) => $k !== ''
    ));

    $date = trim((string) ($data['date'] ?? ''));
    if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) !== 1) {
        $date = date('Y-m-d');
    }

    $cover = require_string($data, 'cover', 500, false);
    // a data: URL would balloon the row and slow every listing query
    if (str_starts_with($cover, 'data:')) {
        throw new ApiError('Upload the cover image first, then send its URL.');
    }

    return [
        'kind'         => $kind,
        'title'        => require_string($data, 'title', 255),
        'description'  => require_string($data, 'description', 5000),
        'category'     => require_string($data, 'category', 100, false)
            ?: ($kind === 'news' ? 'News' : 'Insights'),
        'published_at' => $date,
        'read_minutes' => max(1, min(999, (int) ($data['readMinutes'] ?? 1))),
        'cover'        => $cover,
        'cover_alt'    => require_string($data, 'coverAlt', 500, false),
        'keywords'     => json_encode($keywords, JSON_UNESCAPED_UNICODE),
        'sections'     => json_encode($clean, JSON_UNESCAPED_UNICODE),
        'status'       => ($data['status'] ?? 'published') === 'draft' ? 'draft' : 'published',
    ];
}

function slugify(string $title): string
{
    $slug = strtolower(trim($title));
    $slug = preg_replace('/[^a-z0-9]+/', '-', $slug) ?? '';
    $slug = trim($slug, '-');
    return substr($slug === '' ? 'post' : $slug, 0, 60);
}

/** A slug no other row is using, suffixing -2, -3 … when one is taken. */
function unique_slug(string $base, ?string $ignoreSlug = null): string
{
    $stmt = db()->prepare('SELECT 1 FROM posts WHERE slug = ? AND slug <> ?');
    $candidate = $base;
    for ($n = 2; $n < 200; $n++) {
        $stmt->execute([$candidate, (string) $ignoreSlug]);
        if ($stmt->fetch() === false) {
            return $candidate;
        }
        $candidate = substr($base, 0, 56) . '-' . $n;
    }
    return $base . '-' . bin2hex(random_bytes(3));
}

function find_post(string $slug, bool $includeDrafts = false): ?array
{
    $sql = 'SELECT * FROM posts WHERE slug = ?';
    if (!$includeDrafts) {
        $sql .= " AND status = 'published'";
    }
    $stmt = db()->prepare($sql);
    $stmt->execute([$slug]);
    return $stmt->fetch() ?: null;
}
