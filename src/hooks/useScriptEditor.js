import { updateStoryCut } from '@/lib/database';

export const useScriptEditor = ({
    user,
    storyCut,
    ember,
    id,
    editedScript,
    generateScript,
    setUpdating,
    setError,
    setEditedScript,
    setIsEditingScript,
    setIsSavingScript,
    setStoryCut
}) => {
    // Handle updating the story cut
    const handleUpdateStoryCut = async () => {
        if (!user || !storyCut) return;

        try {
            setUpdating(true);

            // Generate the updated script from current visual controls
            const updatedScript = generateScript();
            console.log('🔄 Updating story cut with script:', updatedScript);

            // Update the story cut in the database
            await updateStoryCut(storyCut.id, {
                full_script: updatedScript
            }, user.id);

            console.log('✅ Story cut updated successfully');

            // Update the local state to reflect the changes
            setStoryCut(prev => ({
                ...prev,
                full_script: updatedScript
            }));

            // Optionally, show a success message or navigate back
            // navigate(`/embers/${id}`);

        } catch (error) {
            console.error('❌ Failed to update story cut:', error);
            setError('Failed to update story cut. Please try again.');
        } finally {
            setUpdating(false);
        }
    };

    // Script editing handlers
    const handleEditScript = async () => {
        console.log('🔍 DEBUG - handleEditScript called');
        console.log('🔍 DEBUG - storyCut:', storyCut);
        console.log('🔍 DEBUG - storyCut?.full_script:', storyCut?.full_script);

        try {
            // Load user-friendly formatted script for editing
            const { formatScriptForDisplay } = await import('@/lib/scriptParser');
            const formattedScript = await formatScriptForDisplay(storyCut?.full_script || '', ember, storyCut);

            console.log('🎨 StoryCutStudio: Loading user-friendly script for editing');
            console.log('🎨 Formatted script preview:', formattedScript.substring(0, 200));

            setEditedScript(formattedScript);
            setIsEditingScript(true);
        } catch (error) {
            console.error('❌ Error formatting script for editing:', error);
            // Fallback to raw script
            const scriptContent = storyCut?.full_script || '';
            setEditedScript(scriptContent);
            setIsEditingScript(true);
        }
    };

    const handleCancelScriptEdit = () => {
        console.log('🔍 DEBUG - handleCancelScriptEdit called');
        setIsEditingScript(false);
        setEditedScript('');
    };

    const handleSaveScript = async () => {
        if (!user || !storyCut?.id || !editedScript.trim()) return;

        try {
            setIsSavingScript(true);

            console.log('🔄 Saving edited script...');

            // Import script reconstruction function
            const { reconstructScript } = await import('@/lib/scriptParser');

            // Reconstruct the original format to preserve metadata (voice IDs, preferences, etc.)
            const reconstructedScript = reconstructScript(
                editedScript.trim(),
                storyCut.full_script,
                storyCut
            );

            console.log('🔧 StoryCutStudio: Reconstructed script preview:', reconstructedScript.substring(0, 200));
            console.log('🔧 StoryCutStudio: Original metadata preserved in reconstructed script');

            // Update the story cut in the database with reconstructed script
            await updateStoryCut(storyCut.id, {
                full_script: reconstructedScript
            }, user.id);

            console.log('✅ Script updated successfully');

            // Update the local state with reconstructed script
            setStoryCut(prev => ({
                ...prev,
                full_script: reconstructedScript
            }));

            // Exit edit mode
            setIsEditingScript(false);
            setEditedScript('');

            // 🔄 Notify EmberPlay and other components to refresh data
            console.log('🔄 Broadcasting script update to other components...');

            // Dispatch custom event to notify other components
            window.dispatchEvent(new CustomEvent('emberScriptUpdated', {
                detail: {
                    emberId: id,
                    storyCutId: storyCut.id,
                    timestamp: Date.now()
                }
            }));

            // Also trigger global refresh actions if available
            if (window.EmberDetailActions?.refreshStoryCuts) {
                window.EmberDetailActions.refreshStoryCuts();
            }

        } catch (error) {
            console.error('❌ Error updating script:', error);
            setError('Failed to update script. Please try again.');
        } finally {
            setIsSavingScript(false);
        }
    };

    return {
        handleUpdateStoryCut,
        handleEditScript,
        handleCancelScriptEdit,
        handleSaveScript
    };
}; 