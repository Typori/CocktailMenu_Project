/**
 * PDF导出配置
 * 可通过Debug页面动态调整
 */

export interface PDFExportConfig {
  // 页面设置
  margin: number; // 页边距 (mm)
  pageWidth: number; // A4 宽度 (mm)
  pageHeight: number; // A4 高度 (mm)
  
  // Canvas设置
  canvasScale: number; // Canvas缩放倍数 (1-3)
  canvasWidth: number; // Canvas宽度 (px)
  
  // 图片设置
  imageFormat: 'png' | 'jpeg'; // 图片格式
  imageQuality: number; // 图片质量 (0-1)
  
  // 渲染设置
  useCORS: boolean; // 是否使用CORS
  allowTaint: boolean; // 是否允许污染
  backgroundColor: string; // 背景色
  imageTimeout: number; // 图片加载超时 (ms)
  renderDelay: number; // 渲染延迟 (ms)
}

// 默认配置
export const DEFAULT_PDF_CONFIG: PDFExportConfig = {
  margin: 20,
  pageWidth: 210,
  pageHeight: 297,
  canvasScale: 1.5,
  canvasWidth: 794,
  imageFormat: 'jpeg',
  imageQuality: 0.92,
  useCORS: true,
  allowTaint: false,
  backgroundColor: '#ffffff',
  imageTimeout: 0,
  renderDelay: 300,
};

// 预设配置
export const PDF_PRESETS = {
  // 高质量 - 文件较大
  highQuality: {
    ...DEFAULT_PDF_CONFIG,
    canvasScale: 2,
    imageFormat: 'png' as const,
    imageQuality: 1.0,
  },
  // 平衡 - 推荐设置
  balanced: {
    ...DEFAULT_PDF_CONFIG,
    canvasScale: 1.5,
    imageFormat: 'jpeg' as const,
    imageQuality: 0.92,
  },
  // 小文件 - 质量较低
  compact: {
    ...DEFAULT_PDF_CONFIG,
    canvasScale: 1.2,
    imageFormat: 'jpeg' as const,
    imageQuality: 0.75,
  },
  // 超高清 - 文件很大
  ultraHD: {
    ...DEFAULT_PDF_CONFIG,
    canvasScale: 3,
    imageFormat: 'png' as const,
    imageQuality: 1.0,
  },
};

// 全局配置实例
let currentConfig: PDFExportConfig = { ...DEFAULT_PDF_CONFIG };

// 获取当前配置
export function getPDFConfig(): PDFExportConfig {
  return { ...currentConfig };
}

// 更新配置
export function updatePDFConfig(config: Partial<PDFExportConfig>): void {
  currentConfig = { ...currentConfig, ...config };
  // 保存到localStorage
  localStorage.setItem('pdfExportConfig', JSON.stringify(currentConfig));
}

// 重置为默认配置
export function resetPDFConfig(): void {
  currentConfig = { ...DEFAULT_PDF_CONFIG };
  localStorage.removeItem('pdfExportConfig');
}

// 应用预设
export function applyPDFPreset(presetName: keyof typeof PDF_PRESETS): void {
  currentConfig = { ...PDF_PRESETS[presetName] };
  localStorage.setItem('pdfExportConfig', JSON.stringify(currentConfig));
}

// 从localStorage加载配置
export function loadPDFConfig(): void {
  try {
    const saved = localStorage.getItem('pdfExportConfig');
    if (saved) {
      currentConfig = { ...DEFAULT_PDF_CONFIG, ...JSON.parse(saved) };
    }
  } catch (error) {
    console.error('Failed to load PDF config:', error);
  }
}

// 初始化时加载配置
loadPDFConfig();
