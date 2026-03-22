<?php
/**
 * reader.php
 * Feeid Reader-Modus
 * Lädt eine URL server-seitig und gibt den bereinigten Hauptinhalt zurück
 * Nutzer verlässt Feeid nie
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$url = $_GET['url'] ?? '';

if (!$url || !filter_var($url, FILTER_VALIDATE_URL)) {
    echo json_encode(['error' => 'Ungültige URL']);
    exit;
}

// Seite abrufen
$context = stream_context_create([
    'http' => [
        'timeout' => 10,
        'header' => ['User-Agent: Feeid/1.0 (Reader)']
    ]
]);

$html = @file_get_contents($url, false, $context);

if ($html === false) {
    echo json_encode(['error' => 'Seite konnte nicht geladen werden']);
    exit;
}

// Basis-Extraktion ohne externe Bibliothek
$result = extractContent($html, $url);

echo json_encode($result);

/**
 * Hauptinhalt aus HTML extrahieren
 * Entfernt Navigation, Werbung, Footer, Cookies etc.
 */
function extractContent(string $html, string $url): array {
    libxml_use_internal_errors(true);
    $doc = new DOMDocument();
    $doc->loadHTML(mb_convert_encoding($html, 'HTML-ENTITIES', 'UTF-8'));
    $xpath = new DOMXPath($doc);

    // Titel
    $titleNodes = $xpath->query('//title');
    $title = $titleNodes->length ? $titleNodes->item(0)->textContent : '';

    // OG-Bild
    $ogImage = $xpath->query('//meta[@property="og:image"]/@content');
    $image = $ogImage->length ? $ogImage->item(0)->textContent : '';

    // OG-Beschreibung
    $ogDesc = $xpath->query('//meta[@property="og:description"]/@content');
    $description = $ogDesc->length ? $ogDesc->item(0)->textContent : '';

    // Unerwünschte Elemente entfernen
    $removeSelectors = ['nav', 'header', 'footer', 'aside', 'script',
                        'style', 'noscript', 'iframe', 'form',
                        '//*[contains(@class,"cookie")]',
                        '//*[contains(@class,"banner")]',
                        '//*[contains(@class,"ad")]',
                        '//*[contains(@id,"nav")]',
                        '//*[contains(@id,"footer")]',
                        '//*[contains(@id,"header")]'];

    foreach ($removeSelectors as $selector) {
        $query = str_starts_with($selector, '//') ? $selector : "//{$selector}";
        foreach ($xpath->query($query) as $node) {
            $node->parentNode?->removeChild($node);
        }
    }

    // Hauptinhalt finden: article > main > body
    $contentNode = null;
    foreach (['//article', '//main', '//*[@id="content"]', '//*[@class="content"]'] as $query) {
        $nodes = $xpath->query($query);
        if ($nodes->length) { $contentNode = $nodes->item(0); break; }
    }
    if (!$contentNode) $contentNode = $doc->getElementsByTagName('body')->item(0);

    // Inhalt als HTML
    $content = '';
    if ($contentNode) {
        foreach ($contentNode->childNodes as $child) {
            $content .= $doc->saveHTML($child);
        }
    }

    // Basis-URL für relative Links
    $parsed = parse_url($url);
    $baseUrl = $parsed['scheme'] . '://' . $parsed['host'];

    // Relative Links zu absoluten machen
    $content = preg_replace('/href=["\']\/([^"\']+)["\']/', "href=\"{$baseUrl}/$1\"", $content);
    $content = preg_replace('/src=["\']\/([^"\']+)["\']/', "src=\"{$baseUrl}/$1\"", $content);

    return [
        'title'       => trim($title),
        'description' => trim($description),
        'image'       => $image,
        'content'     => $content,
        'url'         => $url,
        'base_url'    => $baseUrl
    ];
}
