/**
 * 交易大师控制台 - 主应用入口
 * 初始化各模块并协调工作
 */

class App {
    constructor() {
        this.positionManager = null;
        this.historyManager = null;
        this.chartManager = null;
        this.storageManager = null;
        this.fileImporter = null;
    }

    /**
     * 初始化应用
     */
    init() {
        // 创建各模块实例
        this.positionManager = new PositionManager();
        this.historyManager = new HistoryManager();
        this.chartManager = new ChartManager();
        this.storageManager = new StorageManager();
        this.fileImporter = new FileImporter(this);

        // 设置图表点击交互
        this.chartManager.setupClickInteraction('chart-tooltip', 'equity-svg');

        // 尝试从 localStorage 加载数据
        if (!this.storageManager.loadFromStorage()) {
            // 无缓存数据时，添加默认持仓行
            this.positionManager.addPosition();
            this.chartManager.render();
        }

        // 绑定全局函数供 HTML 调用
        this.bindGlobalFunctions();

        console.log('✅ ALPHA STATION v7.0 已初始化');
    }

    /**
     * 绑定全局函数供 HTML onclick 等调用
     */
    bindGlobalFunctions() {
        // 持仓相关
        window.addPositionRow = () => this.positionManager.addPosition();

        // 历史记录相关
        window.addManualLog = () => this.historyManager.addManualLog();
        window.clearLogs = () => this.historyManager.clearLogs();

        // 存储相关
        window.exportDataLocally = () => this.storageManager.exportData();
        window.toggleEditTheme = (id) => this.storageManager.toggleThemeEdit(id);

        // 文件导入相关
        window.importHistoryFile = (input) => this.fileImporter.importHistoryFile(input);
        window.importLocalJSONBackup = (input) => this.fileImporter.importJSONBackup(input);
    }
}

/**
 * 文件导入器模块
 */
class FileImporter {
    constructor(app) {
        this.app = app;
    }

    /**
     * 导入历史文件（支持 Excel、CSV、TXT）
     * @param {HTMLInputElement} input - 文件输入元素
     */
    importHistoryFile(input) {
        const file = input.files[0];
        if (!file) return;

        const fileName = file.name.toLowerCase();
        const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

        if (isExcel) {
            // 使用 SheetJS 解析 Excel
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    // 读取第一个工作表
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    
                    // 转换为 JSON（数组格式）
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                    
                    this.app.historyManager.processImportedData(jsonData);
                } catch (err) {
                    console.error('Excel 解析错误:', err);
                    alert('❌ Excel 文件解析失败：' + err.message);
                }
            };
            reader.readAsArrayBuffer(file);
        } else {
            // CSV/TXT处理
            const reader = new FileReader();
            reader.onload = (e) => {
                let content = e.target.result;
                
                // 移除 BOM
                if (content.charCodeAt(0) === 0xFEFF) {
                    content = content.slice(1);
                }
                
                const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
                if (lines.length === 0) return;

                // 检测分隔符
                let delimiter = '\t';
                const firstDataLine = lines.find(l => !l.startsWith('=====') && !l.startsWith('工作表'));
                if (firstDataLine) {
                    if (firstDataLine.includes(',')) delimiter = ',';
                    else if (firstDataLine.includes(';')) delimiter = ';';
                }

                // 转换为二维数组
                const dataArray = lines.map(line => 
                    line.split(delimiter).map(c => c.replace(/['"]/g, '').trim())
                );

                this.app.historyManager.processImportedData(dataArray);
            };
            reader.readAsText(file, 'UTF-8');
        }
        
        // 清空 input 以便重复导入同一文件
        input.value = '';
    }

    /**
     * 导入 JSON 备份文件
     * @param {HTMLInputElement} input - 文件输入元素
     */
    importJSONBackup(input) {
        this.app.storageManager.importJSON(input.files[0]);
        input.value = '';
    }
}

// 创建全局 app 实例
const app = new App();

// DOM 加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.init());
} else {
    app.init();
}
