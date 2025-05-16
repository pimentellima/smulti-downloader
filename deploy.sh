#!/bin/bash

set -e  # para parar em caso de erro

# opcional: limpar cache ou preparar variáveis
echo "Iniciando deploy..."

# opcional: instalar dependências (por segurança)
## npm install

npx serverless deploy

echo "Deploy finalizado."
