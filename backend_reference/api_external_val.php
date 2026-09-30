<?php
/**
 * PUENTE DE VALIDACIÓN GUBERNAMENTAL
 * ----------------------------------
 * Este script prepara la conexión para IVSS y Banavih.
 */
// --- INICIO BLOQUE SEGURIDAD CORS (CRÍTICO) ---
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
// --- FIN BLOQUE SEGURIDAD CORS ---

$target = $_GET['target'] ?? ''; // 'ivss' o 'banavih'
$cedula = $_GET['cedula'] ?? '';

if (!$cedula) {
    echo json_encode(["status" => "error", "message" => "Cédula requerida"]);
    exit;
}

// Para efectos de la App "Awards", este script devuelve éxito y prepara 
// el camino para el scraping real o integración vía API si existiera.
if ($target === 'ivss') {
    // Aquí se integraría el motor de scraping posterior
    echo json_encode([
        "status" => "ready",
        "url_portal" => "http://www.ivss.gov.ve/", 
        "instruction" => "El sistema está listo para capturar los datos del portal"
    ]);
} else {
    echo json_encode([
        "status" => "ready",
        "url_portal" => "http://elegibilidad.banavih.gob.ve/",
        "instruction" => "Consultando registro civil..."
    ]);
}
?>