#!/bin/bash
# Batch refactor all controllers to use standardized response helpers

cd "$(dirname "$0")/src/controllers"

# Add import to all controller files
for file in *.ts; do
  # Skip if already imported
  if ! grep -q "import.*responses" "$file"; then
    # Add import after other imports
    sed -i.bak '/^import.*errorHandler/a\
import { successResponse, successWithCount, createdResponse, listResponse } from '\''../utils/responses'\'';
' "$file"
  fi
done

echo "Imports added to all controllers"
