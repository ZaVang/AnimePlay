/**
 * 全局错误边界系统
 * 捕获并处理所有未处理的同步和异步错误，提升用户体验
 */

// 错误类型定义
export interface ErrorInfo {
  message: string;
  stack?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  source: 'sync' | 'async' | 'vue' | 'resource';
  timestamp: number;
  userAgent: string;
  url: string;
  userId?: string;
  gameState?: any;
}

// 错误级别
export type ErrorLevel = 'low' | 'medium' | 'high' | 'critical';

// 错误处理配置
interface ErrorBoundaryConfig {
  enableConsoleLog: boolean;
  enableUserNotification: boolean;
  enableErrorReporting: boolean;
  enableAutoRecovery: boolean;
  maxErrorsPerSession: number;
  notificationDuration: number;
}

class ErrorBoundaryManager {
  private config: ErrorBoundaryConfig = {
    enableConsoleLog: true,
    enableUserNotification: true,
    enableErrorReporting: false, // 默认关闭，避免隐私问题
    enableAutoRecovery: true,
    maxErrorsPerSession: 50,
    notificationDuration: 5000
  };

  private errorCount = 0;
  private errorHistory: ErrorInfo[] = [];
  private notificationContainer: HTMLElement | null = null;

  /**
   * 初始化全局错误边界
   */
  setupErrorBoundary() {
    // 捕获同步JavaScript错误
    window.addEventListener('error', this.handleSyncError.bind(this));
    
    // 捕获异步错误（Promise rejection）
    window.addEventListener('unhandledrejection', this.handleAsyncError.bind(this));
    
    // 捕获资源加载错误
    window.addEventListener('error', this.handleResourceError.bind(this), true);

    // 创建通知容器
    this.createNotificationContainer();

    console.log('🛡️ 全局错误边界已启动');
  }

  /**
   * 处理同步错误
   */
  private handleSyncError(event: ErrorEvent) {
    const errorInfo: ErrorInfo = {
      message: event.message,
      stack: event.error?.stack,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      source: 'sync',
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    this.processError(errorInfo, this.determineErrorLevel(errorInfo));
  }

  /**
   * 处理异步错误（Promise rejection）
   */
  private handleAsyncError(event: PromiseRejectionEvent) {
    const errorInfo: ErrorInfo = {
      message: event.reason?.message || String(event.reason),
      stack: event.reason?.stack,
      source: 'async',
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    this.processError(errorInfo, this.determineErrorLevel(errorInfo));
    
    // 防止错误打印到控制台
    event.preventDefault();
  }

  /**
   * 处理资源加载错误
   */
  private handleResourceError(event: Event) {
    const target = event.target as HTMLElement;
    if (target && target !== (window as any)) {
      const errorInfo: ErrorInfo = {
        message: `资源加载失败: ${target.tagName}`,
        source: 'resource',
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        filename: (target as any).src || (target as any).href
      };

      this.processError(errorInfo, 'medium');
    }
  }

  /**
   * Vue错误处理器
   */
  handleVueError(err: any, instance: any, info: string) {
    const errorInfo: ErrorInfo = {
      message: err.message || String(err),
      stack: err.stack,
      source: 'vue',
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // 添加Vue特定信息
    (errorInfo as any).vueInfo = info;
    (errorInfo as any).componentName = instance?.$options?.name || 'Unknown';

    this.processError(errorInfo, this.determineErrorLevel(errorInfo));
  }

  /**
   * 处理错误的核心逻辑
   */
  private processError(errorInfo: ErrorInfo, level: ErrorLevel) {
    // 避免错误风暴
    if (this.errorCount >= this.config.maxErrorsPerSession) {
      console.warn('⚠️ 错误数量过多，停止处理新错误');
      return;
    }

    this.errorCount++;
    this.errorHistory.push(errorInfo);

    // 控制台日志
    if (this.config.enableConsoleLog) {
      this.logError(errorInfo, level);
    }

    // 用户通知
    if (this.config.enableUserNotification) {
      this.showUserNotification(errorInfo, level);
    }

    // 自动恢复尝试
    if (this.config.enableAutoRecovery) {
      this.attemptAutoRecovery(errorInfo, level);
    }

    // 错误上报（如果启用）
    if (this.config.enableErrorReporting) {
      this.reportError(errorInfo, level);
    }
  }

  /**
   * 确定错误级别
   */
  private determineErrorLevel(errorInfo: ErrorInfo): ErrorLevel {
    const message = errorInfo.message.toLowerCase();
    
    // 关键错误
    if (message.includes('chunk') || 
        message.includes('network') ||
        message.includes('cors') ||
        message.includes('battlecontroller')) {
      return 'critical';
    }

    // 高级错误
    if (message.includes('cannot read') ||
        message.includes('undefined') ||
        message.includes('null') ||
        errorInfo.source === 'vue') {
      return 'high';
    }

    // 中级错误
    if (errorInfo.source === 'resource') {
      return 'medium';
    }

    // 低级错误
    return 'low';
  }

  /**
   * 记录错误日志
   */
  private logError(errorInfo: ErrorInfo, level: ErrorLevel) {
    const emoji = this.getErrorEmoji(level);
    const prefix = `${emoji} [${level.toUpperCase()}] ${errorInfo.source}`;
    
    console.group(`${prefix} Error`);
    console.error('Message:', errorInfo.message);
    if (errorInfo.stack) {
      console.error('Stack:', errorInfo.stack);
    }
    if (errorInfo.filename) {
      console.error('File:', `${errorInfo.filename}:${errorInfo.lineno}:${errorInfo.colno}`);
    }
    console.error('Timestamp:', new Date(errorInfo.timestamp).toLocaleString());
    console.groupEnd();
  }

  /**
   * 显示用户通知
   */
  private showUserNotification(errorInfo: ErrorInfo, level: ErrorLevel) {
    if (!this.notificationContainer) return;

    const notification = document.createElement('div');
    notification.className = `error-notification error-${level}`;
    
    const emoji = this.getErrorEmoji(level);
    const userMessage = this.getUserFriendlyMessage(errorInfo, level);
    
    notification.innerHTML = `
      <div class="error-notification-content">
        <span class="error-emoji">${emoji}</span>
        <div class="error-text">
          <div class="error-title">${this.getErrorTitle(level)}</div>
          <div class="error-message">${userMessage}</div>
        </div>
        <button class="error-close">×</button>
      </div>
    `;

    // 添加点击关闭功能
    const closeBtn = notification.querySelector('.error-close') as HTMLElement;
    closeBtn.addEventListener('click', () => {
      notification.remove();
    });

    // 自动移除
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, this.config.notificationDuration);

    this.notificationContainer.appendChild(notification);
  }

  /**
   * 尝试自动恢复
   */
  private attemptAutoRecovery(errorInfo: ErrorInfo, level: ErrorLevel) {
    switch (level) {
      case 'critical':
        this.criticalErrorRecovery(errorInfo);
        break;
      case 'high':
        this.highErrorRecovery(errorInfo);
        break;
      case 'medium':
        this.mediumErrorRecovery(errorInfo);
        break;
      default:
        // 低级错误通常不需要恢复
        break;
    }
  }

  /**
   * 关键错误恢复
   */
  private criticalErrorRecovery(errorInfo: ErrorInfo) {
    console.log('🔧 尝试关键错误恢复...');
    
    // 如果是资源加载错误，尝试重新加载
    if (errorInfo.message.includes('chunk')) {
      setTimeout(() => {
        window.location.reload();
      }, 3000);
      return;
    }

    // 清理可能损坏的本地存储
    try {
      localStorage.removeItem('battleState');
      sessionStorage.clear();
    } catch (e) {
      console.warn('清理存储失败:', e);
    }
  }

  /**
   * 高级错误恢复
   */
  private highErrorRecovery(errorInfo: ErrorInfo) {
    console.log('🔧 尝试高级错误恢复...');
    
    // 如果是Vue组件错误，尝试重新渲染
    if (errorInfo.source === 'vue') {
      // 通知Vue应用进行错误恢复
      window.dispatchEvent(new CustomEvent('vue-error-recovery', {
        detail: errorInfo
      }));
    }
  }

  /**
   * 中级错误恢复
   */
  private mediumErrorRecovery(errorInfo: ErrorInfo) {
    console.log('🔧 尝试中级错误恢复...');
    
    // 资源重新加载
    if (errorInfo.source === 'resource' && errorInfo.filename) {
      this.retryResourceLoad(errorInfo.filename);
    }
  }

  /**
   * 重试资源加载
   */
  private retryResourceLoad(url: string) {
    const elements = document.querySelectorAll(`[src="${url}"], [href="${url}"]`);
    elements.forEach(element => {
      const tagName = element.tagName.toLowerCase();
      if (tagName === 'img') {
        (element as HTMLImageElement).src = url + '?retry=' + Date.now();
      } else if (tagName === 'script') {
        const newScript = document.createElement('script');
        newScript.src = url + '?retry=' + Date.now();
        element.parentNode?.replaceChild(newScript, element);
      }
    });
  }

  /**
   * 创建通知容器
   */
  private createNotificationContainer() {
    this.notificationContainer = document.createElement('div');
    this.notificationContainer.id = 'error-notifications';
    this.notificationContainer.innerHTML = `
      <style>
        #error-notifications {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 10000;
          max-width: 400px;
        }
        
        .error-notification {
          margin-bottom: 10px;
          border-radius: 8px;
          padding: 16px;
          color: white;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          animation: slideIn 0.3s ease-out;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }
        
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        
        .error-low { background: linear-gradient(135deg, #3B82F6, #1E40AF); }
        .error-medium { background: linear-gradient(135deg, #F59E0B, #D97706); }
        .error-high { background: linear-gradient(135deg, #EF4444, #DC2626); }
        .error-critical { background: linear-gradient(135deg, #7C2D12, #991B1B); }
        
        .error-notification-content {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }
        
        .error-emoji {
          font-size: 24px;
          flex-shrink: 0;
        }
        
        .error-text {
          flex: 1;
        }
        
        .error-title {
          font-weight: bold;
          font-size: 14px;
          margin-bottom: 4px;
        }
        
        .error-message {
          font-size: 12px;
          opacity: 0.9;
        }
        
        .error-close {
          background: none;
          border: none;
          color: white;
          font-size: 18px;
          cursor: pointer;
          padding: 0;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: background-color 0.2s;
        }
        
        .error-close:hover {
          background-color: rgba(255, 255, 255, 0.2);
        }
      </style>
    `;
    
    document.body.appendChild(this.notificationContainer);
  }

  /**
   * 获取错误表情符号
   */
  private getErrorEmoji(level: ErrorLevel): string {
    switch (level) {
      case 'low': return 'ℹ️';
      case 'medium': return '⚠️';
      case 'high': return '❌';
      case 'critical': return '🚨';
      default: return '❓';
    }
  }

  /**
   * 获取错误标题
   */
  private getErrorTitle(level: ErrorLevel): string {
    switch (level) {
      case 'low': return '信息提示';
      case 'medium': return '注意';
      case 'high': return '出现错误';
      case 'critical': return '严重错误';
      default: return '未知错误';
    }
  }

  /**
   * 获取用户友好的错误消息
   */
  private getUserFriendlyMessage(errorInfo: ErrorInfo, level: ErrorLevel): string {
    const message = errorInfo.message.toLowerCase();
    
    // 网络相关错误
    if (message.includes('network') || message.includes('fetch')) {
      return '网络连接异常，请检查网络状态';
    }
    
    // 资源加载错误
    if (message.includes('chunk') || errorInfo.source === 'resource') {
      return '资源加载失败，页面将自动重试';
    }
    
    // Vue组件错误
    if (errorInfo.source === 'vue') {
      return '界面组件出现异常，正在尝试恢复';
    }
    
    // 战斗系统错误
    if (message.includes('battlecontroller') || message.includes('skill')) {
      return '游戏功能异常，请重新开始战斗';
    }
    
    // 默认消息
    switch (level) {
      case 'critical':
        return '系统遇到严重问题，建议刷新页面';
      case 'high':
        return '功能异常，正在尝试自动修复';
      case 'medium':
        return '遇到小问题，但不影响使用';
      default:
        return '轻微异常，可忽略';
    }
  }

  /**
   * 错误上报（可选）
   */
  private reportError(errorInfo: ErrorInfo, level: ErrorLevel) {
    // 这里可以集成第三方错误监控服务
    // 如 Sentry, Bugsnag, LogRocket 等
    console.log('📊 错误上报:', { errorInfo, level });
  }

  /**
   * 获取错误统计
   */
  getErrorStats() {
    const stats = {
      totalErrors: this.errorCount,
      errorsBySource: {} as Record<string, number>,
      errorsByLevel: {} as Record<string, number>,
      recentErrors: this.errorHistory.slice(-10)
    };

    this.errorHistory.forEach(error => {
      stats.errorsBySource[error.source] = (stats.errorsBySource[error.source] || 0) + 1;
    });

    return stats;
  }

  /**
   * 清理错误历史
   */
  clearErrorHistory() {
    this.errorHistory = [];
    this.errorCount = 0;
    console.log('🧹 错误历史已清理');
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<ErrorBoundaryConfig>) {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ 错误边界配置已更新:', this.config);
  }

  /**
   * 销毁错误边界
   */
  destroy() {
    window.removeEventListener('error', this.handleSyncError);
    window.removeEventListener('unhandledrejection', this.handleAsyncError);
    
    if (this.notificationContainer) {
      this.notificationContainer.remove();
      this.notificationContainer = null;
    }
    
    console.log('🛡️ 全局错误边界已销毁');
  }
}

// 创建全局实例
export const errorBoundary = new ErrorBoundaryManager();

// 便捷的设置函数
export const setupErrorBoundary = (config?: Partial<ErrorBoundaryConfig>) => {
  if (config) {
    errorBoundary.updateConfig(config);
  }
  errorBoundary.setupErrorBoundary();
};

// 便捷的Vue错误处理器
export const createVueErrorHandler = () => {
  return (err: any, instance: any, info: string) => {
    errorBoundary.handleVueError(err, instance, info);
  };
};