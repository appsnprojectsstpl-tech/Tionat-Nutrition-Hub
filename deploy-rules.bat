@echo off
echo Deploying Firestore Rules...
echo.
echo Make sure you have Firebase CLI installed:
echo npm install -g firebase-tools
echo.
echo Then run: firebase login
echo.
pause

firebase deploy --only firestore:rules

echo.
echo Done!
pause
