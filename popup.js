document.addEventListener('DOMContentLoaded', function() {
    // 打开侧边栏
    document.getElementById('openSidePanel').addEventListener('click', function() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.sidePanel.open({windowId: tabs[0].windowId});
        });
    });

    // 添加股票按钮点击事件
    document.getElementById('addStock').addEventListener('click', function() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.sidePanel.open({windowId: tabs[0].windowId});
        });
    });

    // 检查代理服务器状态
    // checkProxyStatus();
});

async function checkProxyStatus() {
    try {
        const response = await fetch('http://localhost:3000/status');
        const data = await response.json();
        document.getElementById('status').textContent = data.status;
    } catch (error) {
        document.getElementById('status').textContent = '代理服务器未运行';
    }
}