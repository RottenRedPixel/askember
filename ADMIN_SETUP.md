# Admin Setup Guide

## Database Setup

To set up the super admin functionality, you need to run the following SQL scripts in your Supabase SQL Editor:

### 1. Run the main migration

Copy and paste the contents of `supabase-migration.sql` into your Supabase SQL Editor and execute it. This will:

- Create the `user_profiles` table
- Set up Row Level Security (RLS) policies
- Create triggers for automatic profile creation
- Set up the role system

### 2. Run the admin functions

Copy and paste the contents of `supabase-admin-functions.sql` into your Supabase SQL Editor and execute it. This will:

- Create the `get_user_profiles_with_email()` function for admin dashboard
- Set up proper security for accessing user data

### 3. Create your first super admin

After running the migrations, you need to manually set your first super admin user:

1. Log into your application with the account you want to make super admin
2. Go to your Supabase dashboard → Authentication → Users
3. Copy your User ID
4. Go to Supabase SQL Editor and run:

```sql
UPDATE user_profiles 
SET role = 'super_admin' 
WHERE user_id = 'your-user-id-here';
```

Replace `'your-user-id-here'` with your actual user ID.

## Features

### Role System
- **user**: Default role for new signups
- **admin**: Can access admin features (future expansion)
- **super_admin**: Full admin access, can manage all users
- **moderator**: Moderation features (future expansion)

### Admin Dashboard Features
- View all registered users
- See user statistics (total users, admins, etc.)
- Promote users to admin role
- Demote admin users back to regular users
- Protected against accidentally removing super admin privileges

### Security
- Row Level Security (RLS) policies protect user data
- Only super admins can access the admin dashboard
- Users can only see their own profile data
- Super admin role is protected from accidental changes

## Access

Once set up:
1. Log in with your super admin account
2. You'll see an "Admin" link in the navigation with a red badge
3. Click to access the admin dashboard at `/admin`
4. View and manage all users from the dashboard

## Troubleshooting

If you can't access the admin dashboard:
1. Make sure you've run both SQL migration files
2. Verify your user has the `super_admin` role in the `user_profiles` table
3. Check the browser console for any errors
4. Ensure your Supabase environment variables are correctly set 