#!/bin/bash
# Post-deploy smoke test for video poker on GitHub Pages
# Usage: ./smoke_test.sh [--wait]
#   --wait: Wait 90s for GitHub Pages deployment before testing

set -e

URL="https://micorlov.github.io/video-poker-game/video_poker.html"
TIMEOUT=15

if [ "$1" = "--wait" ]; then
    echo "⏳ Waiting 90s for GitHub Pages deployment..."
    sleep 90
fi

echo "🔍 Smoke test: $URL"
echo ""

# 1. Check HTTP status
STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$URL")
if [ "$STATUS" != "200" ]; then
    echo "❌ FAIL: HTTP status $STATUS (expected 200)"
    exit 1
fi
echo "✅ HTTP 200 OK"

# 2. Check page contains critical elements
PAGE=$(curl -s --max-time $TIMEOUT "$URL")

CHECKS=(
    "id=\"deal-btn\"|DEAL button"
    "id=\"balance\"|Balance display"
    "id=\"payouts\"|Payout table"
    "firebase-app-compat|Firebase SDK"
    "function deal(|deal() function"
    "function draw(|draw() function"
    "function evaluateHand(|evaluateHand() function"
    "function updateScores(|updateScores() function"
    "function signInWithGoogle(|signInWithGoogle() function"
)

PASS=0
FAIL=0

for check in "${CHECKS[@]}"; do
    PATTERN="${check%%|*}"
    LABEL="${check##*|}"
    if echo "$PAGE" | grep -q "$PATTERN"; then
        echo "✅ $LABEL present"
        ((PASS++))
    else
        echo "❌ $LABEL MISSING"
        ((FAIL++))
    fi
done

echo ""
echo "Results: $PASS passed, $FAIL failed"

if [ $FAIL -gt 0 ]; then
    echo "❌ Smoke test FAILED!"
    exit 1
fi

echo "✅ All smoke tests passed!"
