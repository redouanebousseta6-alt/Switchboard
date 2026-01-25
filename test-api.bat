@echo off
echo Testing Switchboard API...
echo.

curl -X POST https://backend-production-d92b.up.railway.app/api/v1/generate -H "Content-Type: application/json" -d "{\"template\":\"untitled_template\",\"sizes\":[{\"width\":600,\"height\":1200}],\"elements\":{}}"

echo.
echo.
echo If you see a JSON response with "success: true", it worked!
echo If you see an error, make sure you've published your template first.
pause
