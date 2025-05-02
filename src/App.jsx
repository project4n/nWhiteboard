import React, { useState, useRef, useEffect } from'react';
import './App.css';
import MenuPopup from './MenuPopup';
import BrushMenuPopup from './BrushMenuPopup';

const App = () => {
    const canvasRef = useRef(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isBrushMenuOpen, setIsBrushMenuOpen] = useState(false);
    const [brushColor, setBrushColor] = useState('#000000');
    const [brushSize, setBrushSize] = useState(5);
    const [pages, setPages] = useState([{ id: 1, drawings: [] }]);
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const [isDrawing, setIsDrawing] = useState(false);
    const [lastX, setLastX] = useState(0);
    const [lastY, setLastY] = useState(0);
    const [saveStatus, setSaveStatus] = useState('');
    const [isErasing, setIsErasing] = useState(false);
    const [lastTime, setLastTime] = useState(0); 
    const [lastDistance, setLastDistance] = useState(0); 
    const [currentSize, setCurrentSize] = useState(brushSize); 

    const menuRef = useRef(null);
    const brushMenuRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        const scale = window.devicePixelRatio || 1;
        canvas.width = canvas.offsetWidth * scale;
        canvas.height = canvas.offsetHeight * scale;
        ctx.scale(scale, scale);

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const redrawPage = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const currentPage = pages[currentPageIndex];
            currentPage.drawings.forEach((drawing) => {
                ctx.beginPath();
                ctx.strokeStyle = drawing.color;
                ctx.lineWidth = drawing.size;
                ctx.moveTo(drawing.x1, drawing.y1);
                ctx.lineTo(drawing.x2, drawing.y2);
                ctx.stroke();
            });
        };

        const handleMouseDown = (e) => {
            setIsDrawing(true);
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const x = (e.clientX - rect.left) * scaleX;
            const y = (e.clientY - rect.top) * scaleY;
            setLastX(x);
            setLastY(y);
            setLastTime(Date.now());
            setLastDistance(0);
            setCurrentSize(brushSize);
        };

        const handleMouseMove = (e) => {
            if (isDrawing) {
                const rect = canvas.getBoundingClientRect();
                const scaleX = canvas.width / rect.width;
                const scaleY = canvas.height / rect.height;
                const x = (e.clientX - rect.left) * scaleX;
                const y = (e.clientY - rect.top) * scaleY;

                const currentTime = Date.now();
                const timeDiff = currentTime - lastTime;
                const distance = Math.sqrt((x - lastX) ** 2 + (y - lastY) ** 2);
                const speed = distance / timeDiff;

                let targetSize;
                if (isErasing) {
                    targetSize = 30;
                } else {
                    const maxSpeed = 10; 
                    const minSize = 1; 
                    const maxSize = brushSize * 2; 
                    targetSize = Math.max(minSize, Math.min(maxSize, brushSize + (maxSpeed - speed) * (maxSize - minSize) / maxSpeed));
                }

                const smoothFactor = 0.2; 
                const newSize = currentSize + (targetSize - currentSize) * smoothFactor;

                const newDrawings = [...pages[currentPageIndex].drawings];
                const color = isErasing? '#FFFFFF' : brushColor;
                newDrawings.push({
                    type: 'line',
                    x1: lastX,
                    y1: lastY,
                    x2: x,
                    y2: y,
                    color: color,
                    size: newSize
                });
                const newPages = [...pages];
                newPages[currentPageIndex] = {
                    ...newPages[currentPageIndex],
                    drawings: newDrawings
                };
                setPages(newPages);
                ctx.beginPath();
                ctx.strokeStyle = color;
                ctx.lineWidth = newSize;
                ctx.moveTo(lastX, lastY);
                ctx.lineTo(x, y);
                ctx.stroke();
                setLastX(x);
                setLastY(y);
                setLastTime(currentTime);
                setLastDistance(distance);
                setCurrentSize(newSize);
            }
        };

        const handleMouseUp = (e) => {
            setIsDrawing(false);
            redrawPage();
        };

        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseup', handleMouseUp);

        redrawPage();

        return () => {
            canvas.removeEventListener('mousedown', handleMouseDown);
            canvas.removeEventListener('mousemove', handleMouseMove);
            canvas.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDrawing, lastX, lastY, brushColor, brushSize, pages, currentPageIndex, isErasing, lastTime, lastDistance, currentSize]);

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const toggleBrushMenu = () => {
        setIsErasing(false);
        setIsBrushMenuOpen(!isBrushMenuOpen);
    };

    const saveFile = () => {
        const data = {
            pages
        };
        window.electronAPI.saveFile(data);
    };

    const openFile = async () => {
        const newPages = await window.electronAPI.openFile();
        if (newPages) {
            setPages(newPages);
            setCurrentPageIndex(0);
        }
    };

    const quitApp = () => {
        window.electronAPI.quitApp();
    };

    const newPage = () => {
        const newId = pages.length + 1;
        const newPages = [...pages, { id: newId, drawings: [] }];
        setPages(newPages);
        setCurrentPageIndex(newPages.length - 1);
    };

    const nextPage = () => {
        if (currentPageIndex < pages.length - 1) {
            setCurrentPageIndex(currentPageIndex + 1);
        }
    };

    const prevPage = () => {
        if (currentPageIndex > 0) {
            setCurrentPageIndex(currentPageIndex - 1);
        }
    };

    const handleOutsideClick = (e) => {
        if (isMenuOpen && menuRef.current &&!menuRef.current.contains(e.target)) {
            setIsMenuOpen(false);
        }
        if (isBrushMenuOpen && brushMenuRef.current &&!brushMenuRef.current.contains(e.target)) {
            setIsBrushMenuOpen(false);
        }
    };

    useEffect(() => {
        document.addEventListener('mousedown', handleOutsideClick);
        return () => {
            document.removeEventListener('mousedown', handleOutsideClick);
        };
    }, [isMenuOpen, isBrushMenuOpen]);

    useEffect(() => {
        const handleSaveResponse = (event, message) => {
            setSaveStatus(message);
            setTimeout(() => {
                setSaveStatus('');
            }, 3000);
        };
        window.electronAPI.onSaveFileResponse(handleSaveResponse);
        return () => {
            window.electronAPI.onSaveFileResponse((callback) => {
                window.electronAPI.removeListener('save-file-response', callback);
            });
        };
    }, []);

    const toggleEraser = () => {
        setIsErasing(!isErasing);
    };

    return (
        <div className="app">
            <canvas ref={canvasRef} className="canvas-fullscreen"></canvas>
            <div className="bottom-bar">
                <div className="left-column">
                    <button onClick={toggleMenu}>菜单</button>
                    {isMenuOpen && <MenuPopup ref={menuRef} saveFile={saveFile} openFile={openFile} quitApp={quitApp} />}
                </div>
                <div className="middle-column">
                    <button onClick={toggleBrushMenu}>画笔</button>
                    {isBrushMenuOpen && (
                        <BrushMenuPopup
                            ref={brushMenuRef}
                            brushColor={brushColor}
                            setBrushColor={setBrushColor}
                            brushSize={brushSize}
                            setBrushSize={setBrushSize}
                        />
                    )}
                    <button onClick={toggleEraser}>橡皮</button>
                    <button>绘图工具</button>
                    <button>立体几何绘制</button>
                    <button>移动画布</button>
                    <button>撤销</button>
                    <button>重做</button>
                </div>
                <div className="right-column">
                    <button onClick={newPage}>新建页面</button>
                    <button>
                        当前第 {currentPageIndex + 1} 页
                    </button>
                    <button onClick={nextPage}>下一页</button>
                    <button onClick={prevPage}>上一页</button>
                </div>
            </div>
            {saveStatus && (
                <div className="save-status">{saveStatus}</div>
            )}
        </div>
    );
};

export default App;    