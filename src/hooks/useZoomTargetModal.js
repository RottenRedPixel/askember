import { useState } from 'react';

export const useZoomTargetModal = (setEffectTargets) => {
    const [showZoomTargetModal, setShowZoomTargetModal] = useState(false);
    const [selectedZoomBlock, setSelectedZoomBlock] = useState(null);

    // Handle saving custom zoom target point
    const handleSaveZoomTarget = async (coordinates) => {
        if (!selectedZoomBlock) return;

        setEffectTargets(prev => ({
            ...prev,
            [`zoom-${selectedZoomBlock.id}`]: {
                type: 'custom',
                coordinates
            }
        }));

        console.log(`🎯 Set custom zoom target for block ${selectedZoomBlock.id}:`, coordinates);
    };

    // Handle closing zoom target modal
    const handleCloseZoomTargetModal = () => {
        setShowZoomTargetModal(false);
        setSelectedZoomBlock(null);
    };

    // Handle opening zoom target modal
    const handleOpenZoomTargetModal = (block) => {
        setSelectedZoomBlock(block);
        setShowZoomTargetModal(true);
    };

    return {
        showZoomTargetModal,
        selectedZoomBlock,
        handleSaveZoomTarget,
        handleCloseZoomTargetModal,
        handleOpenZoomTargetModal
    };
}; 