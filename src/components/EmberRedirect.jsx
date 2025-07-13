import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useStore from '@/store';
import EmberPlay from '@/components/pages/EmberPlay';

/**
 * EmberRedirect Component
 * 
 * Handles legacy /embers/:id routes:
 * - Authenticated users: Redirect to /embers/:id/manage (management view)
 * - Unauthenticated users: Show EmberPlay (public share view)
 * 
 * This maintains backward compatibility while encouraging use of new share routes
 */
export default function EmberRedirect() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useStore();

    useEffect(() => {
        // If user is authenticated, redirect to management route
        if (user) {
            console.log('🔄 Authenticated user accessing legacy route, redirecting to management');
            navigate(`/embers/${id}/manage`, { replace: true });
        }
        // If not authenticated, EmberPlay component will render below for public access
    }, [user, id, navigate]);

    // For unauthenticated users, show the public share view
    if (!user) {
        return <EmberPlay />;
    }

    // For authenticated users, render nothing while redirecting
    return null;
} 