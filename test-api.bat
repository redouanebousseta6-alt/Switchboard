@echo off
echo Testing Switchboard API with template: untitledstemplate
echo.

curl -X POST https://backend-production-d92b.up.railway.app/api/v1/generate -H "Content-Type: application/json" -d "{\"template\":\"untitledstemplate\",\"sizes\":[{\"width\":600,\"height\":1200}],\"elements\":{\"image-1\":{\"url\":\"https://switchboard-production.up.railway.app/b3182b63-2a4f-4e46-b4d5-341d56084372\",\"backgroundColor\":\"transparent\",\"backgroundOpacity\":1,\"contain\":false,\"horizontalAlignment\":\"center\",\"verticalAlignment\":\"middle\",\"opacity\":1,\"angle\":0}}}"

echo.
echo.
echo If you see a JSON response with "success: true" and a "url" field, it worked!
echo The "url" field contains your generated image.
pause
