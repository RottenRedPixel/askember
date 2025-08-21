@echo off
setlocal
set GIT_PAGER=
set PAGER=
git config --local core.pager ""
git add src/store.js
git add "src/components/admin/users/PasswordResetModal.jsx"
git add "src/components/admin/users/UserModal.jsx"
git add "src/components/admin/users/UserManagement.jsx"
git add "src/components/admin/PasswordResetPage.jsx"
git add src/App.jsx
git commit -m "feat: Add password reset functionality for admin users

- Add sendPasswordReset function to store with Supabase integration
- Create PasswordResetModal component for admin interface
- Add password reset button to UserModal for existing users
- Create PasswordResetPage for secure password update flow
- Add /admin/reset-password route for password reset callback
- Implement complete email-based password reset workflow
- Add proper error handling and user feedback
- Support both desktop and mobile interfaces

Version: Added password reset feature to admin panel"
echo Git operations completed successfully
