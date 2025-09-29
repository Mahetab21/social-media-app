@echo off
cd /d D:\socialMediaApp
REM Stage only README.md
git add README.md
REM Try to commit; if nothing to commit, print message and continue
git commit -m "first commit" || echo No changes to commit or commit failed
REM Ensure main branch name
git branch -M main
REM Remove existing origin to avoid duplicate error, ignore errors
git remote remove origin 2>nul
REM Add origin remote
git remote add origin https://github.com/Mahetab21/social-media-app.git
REM Push to origin main (may require authentication)
git push -u origin main
pause
