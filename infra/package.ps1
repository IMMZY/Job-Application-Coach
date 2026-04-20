Write-Host "Packaging Lambda function (linux/x86_64 wheels)..."
pip install -r requirements.txt -t .\package `
    --platform manylinux2014_x86_64 `
    --python-version 3.12 `
    --implementation cp `
    --only-binary=:all: `
    --quiet
Copy-Item *.py package\
Compress-Archive -Path package\* -DestinationPath .\infra\lambda.zip -Force
Remove-Item -Recurse -Force package
Write-Host "Done: infra\lambda.zip created"
Get-Item .\infra\lambda.zip | Select-Object Name, Length
