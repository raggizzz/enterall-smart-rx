param(
    [string]$BackendHealthUrl = "http://localhost:3000/health/ready",
    [string]$PrometheusHealthUrl = "http://localhost:9090/-/healthy",
    [string]$GrafanaHealthUrl = "http://localhost:3001/api/health"
)

$ErrorActionPreference = "Stop"

function Test-Http {
    param([string]$Url)
    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 10
        return $response.StatusCode
    } catch {
        return $null
    }
}

$backend = Test-Http -Url $BackendHealthUrl
$prometheus = Test-Http -Url $PrometheusHealthUrl
$grafana = Test-Http -Url $GrafanaHealthUrl

[PSCustomObject]@{
    BackendReady = $backend
    Prometheus = $prometheus
    Grafana = $grafana
}
