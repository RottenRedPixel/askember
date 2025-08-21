@echo off
set GIT_PAGER=
set PAGER=
git config core.pager ""
echo Adding files...
git add .
echo Committing changes...
git commit -m "feat: Add password reset functionality for admin users - Add sendPasswordReset function to store with Supabase integration - Create PasswordResetModal component for admin interface - Add password reset button to UserModal for existing users - Create PasswordResetPage for secure password update flow - Add /admin/reset-password route for password reset callback - Implement complete email-based password reset workflow - Add proper error handling and user feedback - Support both desktop and mobile interfaces - Version: v1.1.0 - Admin password reset feature"
echo Pushing to remote...
git push
echo Done!
