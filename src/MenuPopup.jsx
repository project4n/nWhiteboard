import React from'react';

const MenuPopup = React.forwardRef(({ quitApp,saveFile, openFile }, ref) => {
    return (
        <div ref={ref} className="menu">
            <button onClick={quitApp}>退出</button>
            <button onClick={() => window.location.reload()}>新建</button>
            <button onClick={saveFile}>保存</button>
            <button onClick={openFile}>打开</button>
            <button>另存为</button>
            <button>设置</button>
        </div>
    );
});

export default MenuPopup;    