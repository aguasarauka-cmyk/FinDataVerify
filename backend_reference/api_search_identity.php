<?php
/**
 * MOTOR DE BÚSQUEDA DE IDENTIDAD (Smart Match V7 - AutoSchema)
 */

// --- INICIO BLOQUE SEGURIDAD CORS (OBLIGATORIO) ---
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
// --- FIN BLOQUE SEGURIDAD CORS ---

// Configuración de Base de Datos
$host = "localhost";
$dbname = "u775249968_FinDataVerify";
$username = "u775249968_jarabaestudio";
$password = getenv('DB_PASSWORD') ?: '';

try {
    // Conexión PDO
    $dsn = "mysql:host=$host;dbname=$dbname;charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];
    $pdo = new PDO($dsn, $username, $password, $options);

    // --- LÓGICA DE AUTODETECCIÓN DE COLUMNAS (CRÍTICO) ---
    // Inspeccionamos la tabla para ver qué columnas existen realmente
    $stmtSchema = $pdo->query("DESCRIBE identidad_cne");
    $dbColumns = $stmtSchema->fetchAll(PDO::FETCH_COLUMN);

    // Lista de posibles nombres para la fecha de nacimiento
    $possibleDateCols = ['fecha_nacimiento', 'nacimiento', 'f_nacimiento', 'fechanac', 'fnac', 'f_nac'];
    $colFecha = null;

    // Buscamos la primera coincidencia
    foreach ($possibleDateCols as $candidate) {
        if (in_array($candidate, $dbColumns)) {
            $colFecha = $candidate;
            break;
        }
    }

    // Construimos la parte del SELECT dinámicamente
    // Si encontramos columna, usamos alias 'as fecha_nacimiento'. Si no, 'NULL as fecha_nacimiento'.
    $selectDatePart = $colFecha ? "$colFecha as fecha_nacimiento" : "NULL as fecha_nacimiento";


    // --- PROCESAMIENTO DEL INPUT ---
    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true);

    if (!is_array($input)) {
        $input = [];
    }

    // Sanitización
    $cedulaInput = isset($input['cedula']) ? $input['cedula'] : '';
    $cedula = preg_replace('/[^0-9]/', '', $cedulaInput); 

    $p_nombre = isset($input['p_nombre']) ? trim(strtoupper($input['p_nombre'])) : '';
    $s_nombre = isset($input['s_nombre']) ? trim(strtoupper($input['s_nombre'])) : '';
    $p_apellido = isset($input['p_apellido']) ? trim(strtoupper($input['p_apellido'])) : '';
    $s_apellido = isset($input['s_apellido']) ? trim(strtoupper($input['s_apellido'])) : '';

    // --- CONSTRUCCIÓN SQL ---
    $sql = "SELECT 
                cedula, 
                primer_nombre, 
                segundo_nombre, 
                primer_apellido, 
                segundo_apellido, 
                cod_centro,
                $selectDatePart
            FROM identidad_cne 
            WHERE 1=1";
    
    $params = [];

    // Filtros
    if (!empty($cedula)) {
        $sql .= " AND cedula = ?";
        $params[] = $cedula;
    }
    if (!empty($p_nombre)) {
        $sql .= " AND primer_nombre LIKE ?";
        $params[] = "$p_nombre%";
    }
    if (!empty($s_nombre)) {
        $sql .= " AND segundo_nombre LIKE ?";
        $params[] = "$s_nombre%";
    }
    if (!empty($p_apellido)) {
        $sql .= " AND primer_apellido LIKE ?";
        $params[] = "$p_apellido%";
    }
    if (!empty($s_apellido)) {
        $sql .= " AND segundo_apellido LIKE ?";
        $params[] = "$s_apellido%";
    }

    // Validación de seguridad para evitar SELECT * sin filtro
    if (empty($params)) {
        echo json_encode(["status" => "error", "message" => "Ingrese al menos un criterio de búsqueda válido"]);
        exit;
    }

    $sql .= " LIMIT 100"; 

    // Preparar y Ejecutar
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();
    
    $resultados = [];

    foreach ($rows as $row) {
        // Nombre Completo
        $full = trim("{$row['primer_nombre']} {$row['segundo_nombre']} {$row['primer_apellido']} {$row['segundo_apellido']}");
        
        // Fecha de Nacimiento (normalizada desde el alias)
        $f_nac = $row['fecha_nacimiento'];
        if ($f_nac === '0000-00-00' || empty($f_nac)) {
            $f_nac = null;
        }

        $ubicacion = $row['cod_centro'];

        $resultados[] = [
            "cedula" => $row['cedula'],
            "nombre_completo" => $full,
            "estado_votacion" => $ubicacion, 
            "fecha_nacimiento" => $f_nac,
            "score" => 100 
        ];
    }

    echo json_encode([
        "status" => "success",
        "debug_col_detected" => $colFecha, // Para saber qué columna encontró (si alguna)
        "count" => count($resultados),
        "results" => $resultados
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "SQL Error: " . $e->getMessage()]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>