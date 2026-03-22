<?php
/**
 * proxy.php
 * Feeid Feed-Proxy
 * Löst CORS-Problem beim Abrufen externer Feeds
 * Unterstützt RSS und ActivityPub (öffentliche Outbox)
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$url    = $_GET['url']    ?? '';
$detect = $_GET['detect'] ?? false;
$user   = $_GET['user']   ?? '';
$pass   = $_GET['pass']   ?? '';

if (!$url) {
    echo json_encode(['error' => 'Keine URL angegeben']);
    exit;
}

// URL validieren
if (!filter_var($url, FILTER_VALIDATE_URL)) {
    echo json_encode(['error' => 'Ungültige URL']);
    exit;
}

// Feed abrufen
$headers = [
    'Accept: application/activity+json, application/ld+json, application/rss+xml, application/xml, text/xml, */*',
    'User-Agent: Feeid/1.0'
];
if ($user !== '' && $pass !== '') {
    $headers[] = 'Authorization: Basic ' . base64_encode($user . ':' . $pass);
}
$context = stream_context_create([
    'http' => [
        'timeout' => 10,
        'header'  => $headers
    ]
]);

$content = @file_get_contents($url, false, $context);

if ($content === false) {
    // HTTP-Statuscode prüfen
    $status = 200;
    foreach ($http_response_header ?? [] as $h) {
        if (preg_match('#HTTP/\S+\s+(\d+)#', $h, $m)) $status = (int)$m[1];
    }
    if ($status === 401) {
        echo json_encode(['error' => 'auth_required', 'status' => 401]);
    } else {
        echo json_encode(['error' => 'Feed konnte nicht abgerufen werden', 'status' => $status]);
    }
    exit;
}

// Typ erkennen: ActivityPub oder RSS?
$type = detectType($content, $http_response_header ?? []);

// Nur Typ erkennen ohne zu parsen
if ($detect) {
    echo json_encode(['type' => $type]);
    exit;
}

// Parsen je nach Typ
if ($type === 'activitypub') {
    $data = json_decode($content, true);
    $items = $data['orderedItems'] ?? $data['items'] ?? [];
    echo json_encode(['type' => 'activitypub', 'items' => $items]);
} else {
    // RSS/Atom parsen
    $items = parseRss($content);
    echo json_encode(['type' => 'rss', 'items' => $items]);
}

/**
 * Typ erkennen anhand Content-Type Header und Inhalt
 */
function detectType(string $content, array $headers): string {
    // Content-Type Header prüfen
    foreach ($headers as $header) {
        if (stripos($header, 'application/activity+json') !== false) return 'activitypub';
        if (stripos($header, 'application/ld+json') !== false) return 'activitypub';
    }
    // Inhalt prüfen
    $trimmed = trim($content);
    if ($trimmed[0] === '{') {
        $data = json_decode($content, true);
        if (isset($data['@context']) && str_contains(json_encode($data['@context']), 'activitystreams')) {
            return 'activitypub';
        }
    }
    return 'rss';
}

/**
 * RSS/Atom Feed parsen
 */
function parseRss(string $content): array {
    libxml_use_internal_errors(true);
    $xml = simplexml_load_string($content);
    if (!$xml) return [];

    $items = [];

    // RSS 2.0
    if (isset($xml->channel)) {
        foreach ($xml->channel->item as $item) {
            $items[] = [
                'guid'        => (string)($item->guid ?? $item->link),
                'title'       => (string)$item->title,
                'description' => strip_tags((string)$item->description),
                'link'        => (string)$item->link,
                'pubDate'     => (string)$item->pubDate,
                'author'      => (string)($item->author ?? $item->children('dc', true)->creator ?? ''),
                'image'       => extractImage($item)
            ];
        }
    }

    // Atom
    if (isset($xml->entry)) {
        foreach ($xml->entry as $entry) {
            $link = '';
            foreach ($entry->link as $l) {
                if ((string)$l['rel'] === 'alternate' || !(string)$l['rel']) {
                    $link = (string)$l['href'];
                    break;
                }
            }
            $items[] = [
                'guid'        => (string)$entry->id,
                'title'       => (string)$entry->title,
                'description' => strip_tags((string)($entry->summary ?? $entry->content)),
                'link'        => $link,
                'pubDate'     => (string)($entry->published ?? $entry->updated),
                'author'      => (string)($entry->author->name ?? ''),
                'image'       => ''
            ];
        }
    }

    return $items;
}

/**
 * Bild aus RSS-Item extrahieren
 */
function extractImage(SimpleXMLElement $item): string {
    // Media RSS
    $media = $item->children('media', true);
    if (isset($media->content['url'])) return (string)$media->content['url'];
    if (isset($media->thumbnail['url'])) return (string)$media->thumbnail['url'];

    // Enclosure
    if (isset($item->enclosure['url'])) {
        $type = (string)$item->enclosure['type'];
        if (str_starts_with($type, 'image/')) return (string)$item->enclosure['url'];
    }

    // Bild aus Description extrahieren
    preg_match('/<img[^>]+src=["\']([^"\']+)["\']/', (string)$item->description, $matches);
    return $matches[1] ?? '';
}
