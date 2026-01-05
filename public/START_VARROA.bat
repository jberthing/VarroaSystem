@echo off
echo Starting Varroa Monitor...
echo.
echo VIGTIGT: Luk IKKE dette vindue mens du bruger appen!
echo.
echo Tryk Ctrl+C for at stoppe serveren
echo.

:: Open browser after a short delay
start /B cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:8000"

:: Try Python 3 first
python -m http.server 8000 2>nul
if %errorlevel% equ 0 goto :done

:: Try Python 2
python -m SimpleHTTPServer 8000 2>nul
if %errorlevel% equ 0 goto :done

:: Try PowerShell
powershell -NoProfile -Command "Start-Process 'http://localhost:8000'; $listener = New-Object System.Net.HttpListener; $listener.Prefixes.Add('http://localhost:8000/'); $listener.Start(); Write-Host 'Server kører på http://localhost:8000'; while ($listener.IsListening) { $context = $listener.GetContext(); $response = $context.Response; $filePath = $context.Request.Url.LocalPath; if ($filePath -eq '/') { $filePath = '/index.html' }; $fullPath = Join-Path $PWD $filePath.TrimStart('/'); if (Test-Path $fullPath) { $content = [System.IO.File]::ReadAllBytes($fullPath); $response.ContentLength64 = $content.Length; $response.OutputStream.Write($content, 0, $content.Length) } else { $response.StatusCode = 404 }; $response.Close() }"

:done
pause
