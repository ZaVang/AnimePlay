/**
 * 性能监控工具
 * 用于测试虚拟化的性能提升效果
 */

interface PerformanceMetrics {
  domNodeCount: number;
  renderTime: number;
  scrollResponsiveness: number;
  memoryUsage: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private observer?: PerformanceObserver;

  /**
   * 开始性能监控
   */
  start() {
    if (typeof window === 'undefined') return;

    // 监控渲染性能
    if ('PerformanceObserver' in window) {
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'measure' && entry.name.includes('vue-render')) {
            console.log(`🚀 [性能] Vue渲染时间: ${entry.duration.toFixed(2)}ms`);
          }
        }
      });
      
      this.observer.observe({ entryTypes: ['measure'] });
    }

    // 定期收集性能指标
    setInterval(() => {
      this.collectMetrics();
    }, 5000);
  }

  /**
   * 停止性能监控
   */
  stop() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  /**
   * 收集当前性能指标
   */
  private collectMetrics() {
    if (typeof window === 'undefined') return;

    const metrics: PerformanceMetrics = {
      domNodeCount: this.getDOMNodeCount(),
      renderTime: this.getLastRenderTime(),
      scrollResponsiveness: this.getScrollResponsiveness(),
      memoryUsage: this.getMemoryUsage()
    };

    this.metrics.push(metrics);
    
    // 输出性能报告
    console.log('📊 [虚拟化性能监控]', {
      DOM节点数: metrics.domNodeCount,
      渲染时间: `${metrics.renderTime.toFixed(2)}ms`,
      滚动响应性: `${metrics.scrollResponsiveness.toFixed(2)}ms`,
      内存使用: `${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`
    });
  }

  /**
   * 获取DOM节点数量
   */
  private getDOMNodeCount(): number {
    return document.querySelectorAll('*').length;
  }

  /**
   * 获取最近的渲染时间
   */
  private getLastRenderTime(): number {
    const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigationTiming) {
      return navigationTiming.loadEventEnd - navigationTiming.domContentLoadedEventStart;
    }
    return 0;
  }

  /**
   * 获取滚动响应性（模拟测量）
   */
  private getScrollResponsiveness(): number {
    // 简化的滚动响应性测量
    const start = performance.now();
    const scrollContainer = document.querySelector('.virtual-grid-container');
    if (scrollContainer) {
      // 模拟滚动事件响应时间
      return performance.now() - start;
    }
    return 0;
  }

  /**
   * 获取内存使用情况
   */
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  /**
   * 获取性能报告
   */
  getPerformanceReport(): {
    averageMetrics: PerformanceMetrics;
    trends: string[];
    recommendations: string[];
  } {
    if (this.metrics.length === 0) {
      return {
        averageMetrics: { domNodeCount: 0, renderTime: 0, scrollResponsiveness: 0, memoryUsage: 0 },
        trends: [],
        recommendations: []
      };
    }

    // 计算平均值
    const averageMetrics = this.metrics.reduce((acc, metric) => ({
      domNodeCount: acc.domNodeCount + metric.domNodeCount,
      renderTime: acc.renderTime + metric.renderTime,
      scrollResponsiveness: acc.scrollResponsiveness + metric.scrollResponsiveness,
      memoryUsage: acc.memoryUsage + metric.memoryUsage
    }));

    const count = this.metrics.length;
    Object.keys(averageMetrics).forEach(key => {
      (averageMetrics as any)[key] /= count;
    });

    // 分析趋势
    const trends: string[] = [];
    const recommendations: string[] = [];

    if (averageMetrics.domNodeCount > 1000) {
      trends.push('DOM节点数量较高，虚拟化有效果');
      recommendations.push('建议启用虚拟化以减少DOM节点');
    } else {
      trends.push('DOM节点数量正常，可能不需要虚拟化');
    }

    if (averageMetrics.renderTime > 100) {
      trends.push('渲染时间较长');
      recommendations.push('考虑优化组件渲染逻辑');
    }

    return {
      averageMetrics,
      trends,
      recommendations
    };
  }
}

// 创建全局性能监控实例
export const performanceMonitor = new PerformanceMonitor();

// 在开发环境下自动启动
if (import.meta.env.DEV) {
  performanceMonitor.start();
  
  // 在控制台提供手动获取报告的方法
  (window as any).__getPerformanceReport = () => {
    const report = performanceMonitor.getPerformanceReport();
    console.group('🚀 虚拟化性能报告');
    console.log('📊 平均性能指标:', report.averageMetrics);
    console.log('📈 性能趋势:', report.trends);
    console.log('💡 优化建议:', report.recommendations);
    console.groupEnd();
    return report;
  };
  
  console.log('🔧 性能监控已启动，输入 __getPerformanceReport() 查看报告');
}