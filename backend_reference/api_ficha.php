<?php
/**
 * API MAESTRA: GESTIÓN DE FICHAS (CORS Habilitado)
 */

// --- INICIO BLOQUE SEGURIDAD CORS (CRÍTICO) ---
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
// --- FIN BLOQUE SEGURIDAD CORS ---

$host = "localhost";
$dbname = "u775249968_FinDataVerify";
$username = "u775249968_jarabaestudio";
$password = getenv('DB_PASSWORD') ?: '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $method = $_SERVER['REQUEST_METHOD'];

    // --- OBTENER FICHA (GET) ---
    if ($method === 'GET') {
        $doc_id = $_GET['document_id'] ?? null;
        if (!$doc_id) throw new Exception("ID de documento requerido");

        $stmt = $pdo->prepare("SELECT * FROM fichas_inteligentes WHERE document_id = ?");
        $stmt->execute([$doc_id]);
        $ficha = $stmt->fetch(PDO::FETCH_ASSOC);

        echo json_encode([
            "status" => "success",
            "exists" => (bool)$ficha,
            "data" => $ficha ? [
                "id" => $ficha['id'],
                "riesgo" => $ficha['riesgo_global'],
                "expediente" => json_decode($ficha['expediente_completo']),
                "notas" => json_decode($ficha['notas_usuario_historial'])
            ] : null
        ]);
    }

    // --- GUARDAR FICHA (POST) ---
    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $doc_id = $input['document_id'];
        $riesgo = $input['riesgo_global'] ?? 'Bajo';
        $expediente = json_encode($input['expediente_completo']);
        $notas = json_encode($input['notas_usuario_historial']);
        $cedula = $input['cliente_validado_cedula'] ?? null;

        $sql = "INSERT INTO fichas_inteligentes 
                (document_id, cliente_validado_cedula, riesgo_global, expediente_completo, notas_usuario_historial) 
                VALUES (:doc, :ced, :rie, :exp, :not)
                ON DUPLICATE KEY UPDATE 
                cliente_validado_cedula = VALUES(cliente_validado_cedula),
                riesgo_global = VALUES(riesgo_global),
                expediente_completo = VALUES(expediente_completo),
                notas_usuario_historial = VALUES(notas_usuario_historial)";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':doc' => $doc_id,
            ':ced' => $cedula,
            ':rie' => $riesgo,
            ':exp' => $expediente,
            ':not' => $notas
        ]);

        echo json_encode(["status" => "success", "message" => "Ficha sincronizada correctamente"]);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>