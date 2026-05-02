#!/bin/bash
# Loop wrapper that keeps running the generation script
# It will resume from where it left off each time

while true; do
    echo "=== Starting generation run at $(date) ==="
    python3 -u /home/z/my-project/scripts/generate-word-details.py
    EXIT_CODE=$?

    # Check how many entries we have
    COUNT=$(python3 -c "import json; print(len(json.load(open('public/word-details.json'))))")
    echo "=== Run finished with exit code $EXIT_CODE. Total entries: $COUNT ==="

    # If we have all words, stop
    if [ "$COUNT" -ge 3150 ]; then
        echo "=== All words processed! ==="
        break
    fi

    # If exit code is 0 (normal completion), stop
    if [ $EXIT_CODE -eq 0 ]; then
        echo "=== Script completed normally ==="
        break
    fi

    # Otherwise, wait and retry
    echo "=== Waiting 10 seconds before retry... ==="
    sleep 10
done
