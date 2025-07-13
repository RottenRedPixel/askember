import EmberPlay from '@/components/pages/EmberPlay';

/**
 * EmberRedirect Component
 * 
 * Shows EmberPlay for all users accessing /embers/:id
 * Identical experience for both authenticated and unauthenticated users
 */
export default function EmberRedirect() {
    console.log('🔄 EmberRedirect: Rendering EmberPlay');
    console.log('🔄 EmberRedirect: Current URL:', window.location.href);
    return <EmberPlay />;
} 