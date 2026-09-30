<?php
/**
 * API MAESTRA DE DOCUMENTOS (Conexión CORS Habilitada)
 */

// --- INICIO BLOQUE SEGURIDAD CORS (CRÍTICO) ---
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Si el navegador pregunta "¿Puedo conectarme?", respondemos SÍ y terminamos.
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
// --- FIN BLOQUE SEGURIDAD CORS ---

// Credenciales
$host = "localhost";
$dbname = "u775249968_FinDataVerify";
$username = "u775249968_jarabaestudio";
$password = getenv('DB_PASSWORD') ?: '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // --- FILTROS ---
    $banco = $_GET['banco'] ?? '';
    $minSaldo = $_GET['min_saldo'] ?? '';
    $fechaInicio = $_GET['fecha_inicio'] ?? '';
    $busqueda = $_GET['q'] ?? '';
    
    // CAPTURA INTELIGENTE DEL LÍMITE
    $limitRequest = $_GET['limit'] ?? $_GET['per_page'] ?? $_GET['rows'] ?? 500;
    $limit = min((int)$limitRequest, 10000); 
    if ($limit <= 0) $limit = 500;

    // SQL MEJORADO
    $sql = "SELECT 
                d.id, 
                d.fileName, 
                d.bankName, 
                d.primaryHolder, 
                d.secondaryHolder, 
                d.endingBalance, 
                d.statementDate, 
                d.address_search_text,
                d.ai_alert_flags, 
                d.link_pdf,
                f.riesgo_global as audit_riesgo,
                CASE WHEN f.id IS NOT NULL THEN 'Auditado' ELSE 'Pendiente' END as audit_status
            FROM extracted_documents d
            LEFT JOIN fichas_inteligentes f ON d.id = f.document_id
            WHERE 1=1";

    $params = [];

    if (!empty($banco)) {
        $sql .= " AND d.bankName = ?";
        $params[] = $banco;
    }
    if (!empty($minSaldo)) {
        $sql .= " AND d.endingBalance >= ?";
        $params[] = $minSaldo;
    }
    if (!empty($fechaInicio)) {
        $sql .= " AND d.statementDate >= ?";
        $params[] = $fechaInicio;
    }
    if (!empty($busqueda)) {
        $sql .= " AND (d.primaryHolder LIKE ? OR d.address_search_text LIKE ?)";
        $params[] = "%$busqueda%";
        $params[] = "%$busqueda%";
    }

    $sql .= " ORDER BY d.statementDate DESC LIMIT $limit";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "status" => "success",
        "requested_limit" => $limit,
        "count" => count($data),
        "data" => $data
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>