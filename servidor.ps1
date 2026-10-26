$portLocal = 3456
$portRed = 5357
$root = $PSScriptRoot
$dataFile = Join-Path $root "datos_finca.json"

# Obtener IPs locales de la red (Wi-Fi / Ethernet)
$localIps = @((Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -ne "127.0.0.1" -and $_.IPAddress -notlike "169.254*" }).IPAddress)
$ipPrincipal = if ($localIps.Count -gt 0) { $localIps[0] } else { "127.0.0.1" }
$urlRed = "http://$($ipPrincipal):$portRed/"

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$portLocal/")
$listener.Prefixes.Add("http://127.0.0.1:$portLocal/")
$listener.Prefixes.Add("http://*:$portRed/")
$listener.Start()

Write-Host "====================================================" -ForegroundColor Green
Write-Host "  ALDAZ CHOCOLATE FARM - SISTEMA MULTI-DISPOSITIVO ACTIVO" -ForegroundColor Yellow
Write-Host "  Computadora Local:           http://localhost:$portLocal/" -ForegroundColor Cyan
Write-Host "  Cualquier Teléfono o Tablet: $urlRed" -ForegroundColor Magenta
Write-Host "  Base de datos central:       datos_finca.json" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Green

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        try {
            $req = $context.Request
            $res = $context.Response

            $res.Headers.Add("Access-Control-Allow-Origin", "*")
            $res.Headers.Add("Access-Control-Allow-Methods", "GET, POST, HEAD, OPTIONS")
            $res.Headers.Add("Access-Control-Allow-Headers", "Content-Type")

            $path = $req.Url.LocalPath

            if ($req.HttpMethod -eq "OPTIONS") {
                $res.StatusCode = 204
                $res.Close()
                continue
            }

            if ($path -eq "/api/info-red" -and ($req.HttpMethod -eq "GET" -or $req.HttpMethod -eq "HEAD")) {
                $res.ContentType = "application/json; charset=utf-8"
                $infoObj = @{
                    ok = $true
                    ips = $localIps
                    ipPrincipal = $ipPrincipal
                    puertoLocal = $portLocal
                    puertoRed = $portRed
                    urlLocal = "http://localhost:$portLocal/"
                    urlRed = "http://$($ipPrincipal):$portRed/"
                } | ConvertTo-Json -Compress
                $buffer = [System.Text.Encoding]::UTF8.GetBytes($infoObj)
                $res.ContentLength64 = $buffer.Length
                if ($req.HttpMethod -ne "HEAD") {
                    $res.OutputStream.Write($buffer, 0, $buffer.Length)
                }
                $res.Close()
                continue
            }

            if ($path -eq "/api/precio-cacao" -and ($req.HttpMethod -eq "GET" -or $req.HttpMethod -eq "HEAD")) {
                $res.ContentType = "application/json; charset=utf-8"
                $precioTon = 5686.0
                $cierreAnt = 5735.0
                $enVivo = $false
                try {
                    $yahooUri = "https://query1.finance.yahoo.com/v8/finance/chart/CC=F?interval=1d&range=5d"
                    $yahooResp = Invoke-RestMethod -Uri $yahooUri -Headers @{"User-Agent"="Mozilla/5.0"} -TimeoutSec 6
                    $meta = $yahooResp.chart.result[0].meta
                    if ($meta -and $meta.regularMarketPrice -gt 0) {
                        $precioTon = [double]$meta.regularMarketPrice
                        if ($meta.chartPreviousClose -gt 0) {
                            $cierreAnt = [double]$meta.chartPreviousClose
                        }
                        $enVivo = $true
                    }
                } catch {
                    $enVivo = $false
                }
                # 1 Tonelada Metrica = 1000 kg = 2204.62262 libras = 22.0462262 quintales (de 100 lb)
                $precioQQ = [math]::Round($precioTon / 22.0462262, 2)
                $precioLB = [math]::Round($precioQQ / 100.0, 2)
                $cambioTon = [math]::Round($precioTon - $cierreAnt, 2)
                $cambioPct = if ($cierreAnt -gt 0) { [math]::Round((($precioTon - $cierreAnt) / $cierreAnt) * 100.0, 2) } else { 0 }
                $horaStr = (Get-Date).ToString("dd/MM/yyyy HH:mm")
                $payload = @{
                    ok = $true
                    enVivo = $enVivo
                    simbolo = "CC=F"
                    bolsa = "ICE Nueva York (Futuros de Cacao)"
                    precioTonelada = $precioTon
                    cierreAnterior = $cierreAnt
                    precioQuintal = $precioQQ
                    precioLibra = $precioLB
                    cambioTonelada = $cambioTon
                    cambioPorcentaje = $cambioPct
                    actualizado = $horaStr
                } | ConvertTo-Json -Compress
                $buffer = [System.Text.Encoding]::UTF8.GetBytes($payload)
                $res.ContentLength64 = $buffer.Length
                if ($req.HttpMethod -ne "HEAD") {
                    $res.OutputStream.Write($buffer, 0, $buffer.Length)
                }
                $res.Close()
                continue
            }

            if ($path -eq "/api/datos" -and ($req.HttpMethod -eq "GET" -or $req.HttpMethod -eq "HEAD")) {
                $res.ContentType = "application/json; charset=utf-8"
                if (Test-Path $dataFile) {
                    $content = [System.IO.File]::ReadAllText($dataFile, [System.Text.Encoding]::UTF8)
                } else {
                    $content = '{"empty":true}'
                }
                $buffer = [System.Text.Encoding]::UTF8.GetBytes($content)
                $res.ContentLength64 = $buffer.Length
                if ($req.HttpMethod -ne "HEAD") {
                    $res.OutputStream.Write($buffer, 0, $buffer.Length)
                }
                $res.Close()
                continue
            }

            if ($path -eq "/api/datos" -and $req.HttpMethod -eq "POST") {
                $reader = New-Object System.IO.StreamReader($req.InputStream, [System.Text.Encoding]::UTF8)
                $body = $reader.ReadToEnd()
                $reader.Close()

                [System.IO.File]::WriteAllText($dataFile, $body, [System.Text.Encoding]::UTF8)

                $res.ContentType = "application/json; charset=utf-8"
                $horaGuardado = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
                $respJson = "{`"ok`":true,`"guardado`":`"$horaGuardado`"}"
                $buffer = [System.Text.Encoding]::UTF8.GetBytes($respJson)
                $res.ContentLength64 = $buffer.Length
                $res.OutputStream.Write($buffer, 0, $buffer.Length)
                $res.Close()
                continue
            }

            if ($path -eq "/") { $path = "/index.html" }
            $filePath = Join-Path $root ($path.TrimStart('/').Replace('/', '\'))

            if (Test-Path $filePath -PathType Leaf) {
                $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
                switch ($ext) {
                    ".html" { $res.ContentType = "text/html; charset=utf-8" }
                    ".css"  { $res.ContentType = "text/css; charset=utf-8" }
                    ".js"   { $res.ContentType = "application/javascript; charset=utf-8" }
                    ".json" { $res.ContentType = "application/json; charset=utf-8" }
                    default { $res.ContentType = "application/octet-stream" }
                }
                $bytes = [System.IO.File]::ReadAllBytes($filePath)
                $res.ContentLength64 = $bytes.Length
                if ($req.HttpMethod -ne "HEAD") {
                    $res.OutputStream.Write($bytes, 0, $bytes.Length)
                }
            } else {
                $res.StatusCode = 404
            }
            $res.Close()
        } catch {
            try { $context.Response.Close() } catch {}
        }
    }
} finally {
    $listener.Stop()
}
