import { useState, useRef, useEffect, useCallback } from "react";

export const useMemeCanvasLogic = (showToast) => {
    // sticker instances on canvas
    const [items, setItems] = useState([]);
    const [activeId, setActiveId] = useState(null);

    // text positioning and sizing state
    const [textPositions, setTextPositions] = useState({
        top: { x: 0.5, y: 0.1, scale: 1 },
        bottom: { x: 0.5, y: 0.90, scale: 1 }
    });
    const [activeTextId, setActiveTextId] = useState(null);

    // resize state
    const [isResizing, setIsResizing] = useState(false);
    const [resizeTarget, setResizeTarget] = useState(null);
    const [resizeStartScale, setResizeStartScale] = useState(1);
    const [resizeStartY, setResizeStartY] = useState(0);
    const [resizeStartX, setResizeStartX] = useState(0);

    // rotation state
    const [isRotating, setIsRotating] = useState(false);
    const [rotateTarget, setRotateTarget] = useState(null);
    const [rotateStartAngle, setRotateStartAngle] = useState(0);
    const [rotateStartY, setRotateStartY] = useState(0);
    const [rotateStartX, setRotateStartX] = useState(0);

    const stageRef = useRef(null);

    const onAddSticker = (s) => {
        setItems((prev) => [
            ...prev,
            {
                id: `${s.id}-${crypto.randomUUID()}`,
                x: 40 + prev.length * 16,
                y: 40 + prev.length * 16,
                image: s.image,
                name: s.name,
                scale: 1,
                rotation: 0,
            },
        ]);
    };

    const removeAllStickers = () => {
        setItems([]);
        setActiveId(null);
        if (showToast) showToast("All stickers removed!");
    };

    const removeSticker = (stickerId) => {
        setItems(items.filter(item => item.id !== stickerId));
        if (activeId === stickerId) {
            setActiveId(null);
        }
        if (showToast) showToast("Sticker removed!");
    };

    const handlePointerDown = (id) => (e) => {
        e.preventDefault();
        e.stopPropagation();
        setActiveId(id);
        e.target.setPointerCapture(e.pointerId);
    };

    const handleTextPointerDown = (textId) => (e) => {
        e.preventDefault();
        e.stopPropagation();
        setActiveTextId(textId);
        e.target.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e) => {
        if ((!activeId && !activeTextId) || !stageRef.current) return;

        const rect = stageRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left - 16;
        const y = e.clientY - rect.top - 16;

        if (activeId) {
            setItems((prev) =>
                prev.map((it) =>
                    it.id === activeId
                        ? {
                            ...it,
                            x: Math.max(0, Math.min(rect.width - 32, x)),
                            y: Math.max(0, Math.min(rect.height - 32, y)),
                        }
                        : it
                )
            );
        }

        if (activeTextId) {
            setTextPositions((prev) => ({
                ...prev,
                [activeTextId]: {
                    ...prev[activeTextId],
                    x: Math.max(0, Math.min(1, x / rect.width)),
                    y: Math.max(0, Math.min(1, y / rect.height)),
                }
            }));
        }
    };

    const handlePointerUp = () => {
        setActiveId(null);
        setActiveTextId(null);
    };

    const handleResizeStart = (targetType, targetId, e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsResizing(true);
        setResizeTarget({ type: targetType, id: targetId });

        if (targetType === 'text') {
            setResizeStartScale(textPositions[targetId].scale);
        } else if (targetType === 'sticker') {
            const sticker = items.find(item => item.id === targetId);
            setResizeStartScale(sticker.scale);
        }
        setResizeStartY(e.clientY);
        setResizeStartX(e.clientX);
    };

    const handleResizeMove = (e) => {
        if (!isResizing || !resizeTarget) return;

        const deltaY = e.clientY - resizeStartY;
        const deltaX = e.clientX - resizeStartX;

        // Since resize handle is at bottom-right corner:
        // - Dragging southeast (down-right) should increase size
        // - Dragging northwest (up-left) should decrease size
        // We combine both X and Y movement for intuitive diagonal resizing
        const scaleDelta = (deltaY + deltaX) * 0.003; // Combined movement for natural feel
        const newScale = Math.max(0.5, Math.min(2, resizeStartScale + scaleDelta));

        if (resizeTarget.type === 'text') {
            setTextPositions((prev) => ({
                ...prev,
                [resizeTarget.id]: {
                    ...prev[resizeTarget.id],
                    scale: newScale
                }
            }));
        } else if (resizeTarget.type === 'sticker') {
            setItems((prev) =>
                prev.map((item) =>
                    item.id === resizeTarget.id
                        ? { ...item, scale: newScale }
                        : item
                )
            );
        }
    };

    const handleResizeEnd = () => {
        setIsResizing(false);
        setResizeTarget(null);
        setResizeStartScale(1);
        setResizeStartY(0);
        setResizeStartX(0);
    };

    const handleRotateStart = (targetType, targetId, e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsRotating(true);
        setRotateTarget({ type: targetType, id: targetId });

        if (targetType === 'sticker') {
            const sticker = items.find(item => item.id === targetId);
            setRotateStartAngle(sticker.rotation || 0);
        }
        setRotateStartY(e.clientY);
        setRotateStartX(e.clientX);
    };

    const handleRotateMove = (e) => {
        if (!isRotating || !rotateTarget) return;

        const rect = stageRef.current.getBoundingClientRect();
        const sticker = items.find(item => item.id === rotateTarget.id);

        if (!sticker) return;

        // Calculate center of sticker
        const stickerCenterX = sticker.x + 24; // 24 is half of max sticker size (48px)
        const stickerCenterY = sticker.y + 24;

        // Calculate mouse position relative to sticker center
        const mouseX = e.clientX - rect.left - stickerCenterX;
        const mouseY = e.clientY - rect.top - stickerCenterY;

        // Calculate current angle from center to mouse
        const currentAngle = Math.atan2(mouseY, mouseX) * (180 / Math.PI);

        // Calculate start angle from center to initial mouse position
        const startAngle = Math.atan2(rotateStartY - rect.top - stickerCenterY, rotateStartX - rect.left - stickerCenterX) * (180 / Math.PI);

        // Calculate the difference and apply to start rotation
        let deltaAngle = currentAngle - startAngle;

        // Handle angle wrapping for smooth rotation
        if (deltaAngle > 180) deltaAngle -= 360;
        if (deltaAngle < -180) deltaAngle += 360;

        // Apply rotation
        const newRotation = (rotateStartAngle + deltaAngle) % 360;

        if (rotateTarget.type === 'sticker') {
            setItems((prev) =>
                prev.map((item) =>
                    item.id === rotateTarget.id
                        ? { ...item, rotation: newRotation }
                        : item
                )
            );
        }
    };

    const handleRotateEnd = () => {
        setIsRotating(false);
        setRotateTarget(null);
        setRotateStartAngle(0);
        setRotateStartY(0);
        setRotateStartX(0);
    };

    return {
        items,
        setItems,
        textPositions,
        setTextPositions,
        stageRef,
        activeId,
        setActiveId,
        activeTextId,
        setActiveTextId,
        onAddSticker,
        removeAllStickers,
        removeSticker,
        handlePointerDown,
        handleTextPointerDown,
        handlePointerMove,
        handlePointerUp,
        handleResizeStart,
        handleResizeMove,
        handleResizeEnd,
        handleRotateStart,
        handleRotateMove,
        handleRotateEnd
    };
};
