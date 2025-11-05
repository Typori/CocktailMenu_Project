import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

// 全局滚动位置存储
const scrollPositions = new Map<string, number>();

/**
 * 查找实际的滚动容器
 * 优先查找 main 元素，如果没有则使用 window
 */
function getScrollContainer(): HTMLElement | Window {
  const mainElement = document.querySelector('main');
  if (mainElement) {
    // 检查 main 元素是否有 overflow 样式
    const computedStyle = window.getComputedStyle(mainElement);
    const overflow = computedStyle.overflow || computedStyle.overflowY;
    
    // 如果有 overflow-auto 或 overflow-scroll，检查是否真的可以滚动
    if (overflow === 'auto' || overflow === 'scroll') {
      // 检查是否有滚动内容
      if (mainElement.scrollHeight > mainElement.clientHeight) {
        return mainElement;
      }
    }
  }
  return window;
}

/**
 * 获取滚动位置
 */
function getScrollPosition(container: HTMLElement | Window): number {
  if (container instanceof Window) {
    return window.scrollY;
  }
  return container.scrollTop;
}

/**
 * 设置滚动位置
 */
function setScrollPosition(container: HTMLElement | Window, position: number): void {
  if (container instanceof Window) {
    window.scrollTo(0, position);
  } else {
    container.scrollTop = position;
  }
}

/**
 * 自定义Hook：自动保存和恢复滚动位置
 * @param key 可选的唯一标识符，默认使用当前路由路径
 */
export function useScrollRestoration(key?: string) {
  const location = useLocation();
  const scrollKey = key || location.pathname;
  const isRestoringRef = useRef(false);

  useEffect(() => {
    // 延迟获取滚动容器，确保 DOM 已完全加载
    const getContainer = () => getScrollContainer();
    let container = getContainer();
    
    // 恢复滚动位置
    const savedPosition = scrollPositions.get(scrollKey);
    if (savedPosition !== undefined && !isRestoringRef.current) {
      isRestoringRef.current = true;
      
      // 重试恢复滚动位置，直到成功或超时
      let retryCount = 0;
      const maxRetries = 20; // 最多重试20次
      
      const attemptRestore = () => {
        const currentContainer = getScrollContainer();
        setScrollPosition(currentContainer, savedPosition);
        
        // 验证是否成功恢复
        setTimeout(() => {
          const actualPosition = getScrollPosition(currentContainer);
          const positionDiff = Math.abs(actualPosition - savedPosition);
          
          // 如果位置差距大于5px且还有重试次数，继续重试
          if (positionDiff > 5 && retryCount < maxRetries) {
            retryCount++;
            setTimeout(attemptRestore, 50); // 50ms后重试
          } else {
            // 重置标志
            setTimeout(() => {
              isRestoringRef.current = false;
            }, 100);
          }
        }, 10);
      };
      
      // 使用多层延迟确保在所有渲染完成后执行
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(attemptRestore, 100); // 初始延迟100ms
        });
      });
    }

    // 保存滚动位置的处理函数
    const handleScroll = () => {
      if (!isRestoringRef.current) {
        // 每次滚动时重新获取容器，确保使用正确的容器
        const currentContainer = getContainer();
        const position = getScrollPosition(currentContainer);
        scrollPositions.set(scrollKey, position);
      }
    };

    // 监听滚动事件 - 绑定到正确的容器
    if (container instanceof Window) {
      window.addEventListener('scroll', handleScroll, { passive: true });
    } else {
      container.addEventListener('scroll', handleScroll, { passive: true });
    }

    // 清理函数
    return () => {
      if (container instanceof Window) {
        window.removeEventListener('scroll', handleScroll);
      } else {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, [scrollKey]);

  // 提供手动清除滚动位置的方法
  const clearScrollPosition = () => {
    scrollPositions.delete(scrollKey);
  };

  return { clearScrollPosition };
}

/**
 * 用于容器内滚动的Hook
 * @param containerRef 容器的ref
 * @param key 唯一标识符
 */
export function useContainerScrollRestoration(
  containerRef: React.RefObject<HTMLElement>,
  key: string
) {
  const isRestoringRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 恢复滚动位置
    const savedPosition = scrollPositions.get(key);
    
    if (savedPosition !== undefined && !isRestoringRef.current) {
      isRestoringRef.current = true;
      
      // 使用重试机制确保恢复成功
      let retryCount = 0;
      const maxRetries = 20;
      
      const attemptRestore = () => {
        container.scrollTop = savedPosition;
        
        setTimeout(() => {
          const actualPosition = container.scrollTop;
          const positionDiff = Math.abs(actualPosition - savedPosition);
          
          if (positionDiff > 5 && retryCount < maxRetries) {
            retryCount++;
            setTimeout(attemptRestore, 50);
          } else {
            setTimeout(() => {
              isRestoringRef.current = false;
            }, 100);
          }
        }, 10);
      };
      
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(attemptRestore, 100);
        });
      });
    }

    // 保存滚动位置的处理函数
    const handleScroll = () => {
      if (!isRestoringRef.current) {
        const position = container.scrollTop;
        scrollPositions.set(key, position);
      }
    };

    // 监听滚动事件
    container.addEventListener('scroll', handleScroll, { passive: true });

    // 清理函数
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [containerRef, key]);

  // 提供手动清除滚动位置的方法
  const clearScrollPosition = () => {
    scrollPositions.delete(key);
  };

  return { clearScrollPosition };
}
