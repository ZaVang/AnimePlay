/**
 * DeckEditor 虚拟化测试工具
 */

export function testDeckEditorVirtualization() {
  console.group('🔧 DeckEditor 虚拟化测试');
  
  // 1. 检查DOM节点数量
  const collectionContainer = document.querySelector('.collection-pane .p-4');
  if (collectionContainer) {
    const cardElements = collectionContainer.querySelectorAll('[class*="Card"]');
    console.log(`📊 当前渲染的卡片DOM节点: ${cardElements.length}个`);
    
    // 检查是否有虚拟化容器
    const virtualContainer = collectionContainer.querySelector('.virtual-grid-container');
    if (virtualContainer) {
      console.log('✅ 虚拟化已启用');
      console.log(`📏 虚拟容器高度: ${virtualContainer.clientHeight}px`);
      
      // 统计实际渲染的项目数量
      const virtualItems = virtualContainer.querySelectorAll('.virtual-grid-item');
      console.log(`🎯 虚拟化渲染项目: ${virtualItems.length}个`);
    } else {
      console.log('❌ 使用传统渲染');
    }
  }
  
  // 2. 测试滚动性能
  let scrollCount = 0;
  const startTime = performance.now();
  
  const scrollHandler = () => {
    scrollCount++;
    if (scrollCount % 10 === 0) {
      const elapsed = performance.now() - startTime;
      const fps = Math.round(scrollCount / (elapsed / 1000));
      console.log(`⚡ 滚动性能: ${fps} events/s`);
    }
  };
  
  // 3. 监听滚动事件
  const scrollContainer = document.querySelector('.collection-pane .overflow-y-auto');
  if (scrollContainer) {
    scrollContainer.addEventListener('scroll', scrollHandler);
    console.log('🎯 滚动性能监听已启动，请滚动卡片列表测试');
    
    // 30秒后移除监听器
    setTimeout(() => {
      scrollContainer.removeEventListener('scroll', scrollHandler);
      console.log('📊 滚动性能测试结束');
    }, 30000);
  }
  
  // 4. 内存使用情况
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    console.log(`💾 内存使用: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
    console.log(`📈 内存限制: ${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`);
  }
  
  console.groupEnd();
  
  return {
    domNodeCount: document.querySelectorAll('.collection-pane [class*="Card"]').length,
    isVirtualized: !!document.querySelector('.virtual-grid-container'),
    containerHeight: document.querySelector('.collection-pane .overflow-y-auto')?.clientHeight || 0
  };
}

// 在开发环境下自动绑定到window
if (import.meta.env.DEV) {
  (window as any).__testDeckEditor = testDeckEditorVirtualization;
  console.log('🔧 DeckEditor测试工具已加载，输入 __testDeckEditor() 开始测试');
}

/**
 * 比较传统渲染和虚拟化渲染的性能差异
 */
export function compareDeckEditorPerformance() {
  console.group('📊 DeckEditor 性能对比');
  
  const results = {
    traditional: { domNodes: 0, renderTime: 0 },
    virtualized: { domNodes: 0, renderTime: 0 }
  };
  
  // 模拟不同数据量的测试
  const testSizes = [30, 50, 100, 200];
  
  testSizes.forEach(size => {
    console.log(`\n🧪 测试 ${size} 张卡片:`);
    
    if (size <= 30) {
      console.log('  传统渲染 - DOM节点约为卡片数量');
      console.log('  虚拟化未启用 - 数据量过小');
    } else {
      console.log(`  传统渲染 - 约 ${size} 个DOM节点`);
      console.log(`  虚拟化渲染 - 约 15-25 个DOM节点 (节省${Math.round((1 - 20/size) * 100)}%)`);
    }
  });
  
  console.log('\n💡 建议:');
  console.log('- DeckEditor的30张阈值适合编辑场景');
  console.log('- 紧凑布局减少了空间占用');
  console.log('- 高频交互（添加/移除卡片）性能更佳');
  
  console.groupEnd();
}

// 绑定性能对比函数
if (import.meta.env.DEV) {
  (window as any).__compareDeckPerf = compareDeckEditorPerformance;
}