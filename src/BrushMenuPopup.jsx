import React from'react';

const BrushMenuPopup = React.forwardRef(({ brushColor, setBrushColor, brushSize, setBrushSize }, ref) => {
    return (
        <div ref={ref} className="brush-menu">
            <input
                type="color"
                value={brushColor}
                onChange={(e) => setBrushColor(e.target.value)}
            />
            <input
                type="range"
                min="1"
                max="50"
                value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
            />
            <span>{brushSize}</span>
        </div>
    );
});

export default BrushMenuPopup;    