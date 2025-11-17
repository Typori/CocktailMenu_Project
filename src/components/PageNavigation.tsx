import { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

export interface NavigationSection {
  id: string;
  label: string;
  key: string; // 键盘快捷键（1-9）
}

interface PageNavigationProps {
  sections: NavigationSection[];
}

export function PageNavigation({ sections }: PageNavigationProps) {
  const [activeSection, setActiveSection] = useState<string>(sections[0]?.id || '');
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);

  // 滚动到指定区域
  const scrollToSection = useCallback((sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const yOffset = -80; // 顶部偏移量，避免被固定头部遮挡
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      
      window.scrollTo({
        top: y,
        behavior: 'smooth'
      });
    }
  }, []);

  // 检测当前所在区域
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 150; // 增加一些偏移量

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        const element = document.getElementById(section.id);
        
        if (element) {
          const offsetTop = element.offsetTop;
          if (scrollPosition >= offsetTop) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // 初始检查

    return () => window.removeEventListener('scroll', handleScroll);
  }, [sections]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // 检查是否在输入框、文本域或可编辑元素中
      const target = e.target as HTMLElement;
      const isInputElement = 
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      if (isInputElement) return;

      // 检查是否按下数字键（1-9）
      const key = e.key;
      const section = sections.find(s => s.key === key);
      
      if (section) {
        e.preventDefault();
        scrollToSection(section.id);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [sections, scrollToSection]);

  if (sections.length === 0) return null;

  return (
    <div className="fixed right-[calc((100vw-min(1280px,100%))/2+1rem)] top-1/2 -translate-y-1/2 z-30 flex flex-col gap-3">
      {sections.map((section) => {
        const isActive = activeSection === section.id;
        const isHovered = hoveredSection === section.id;
        
        return (
          <div
            key={section.id}
            className="relative flex items-center justify-end group"
            onMouseEnter={() => setHoveredSection(section.id)}
            onMouseLeave={() => setHoveredSection(null)}
          >
            {/* 标签提示 */}
            <div
              className={cn(
                "absolute right-full mr-3 px-3 py-1.5 rounded-md bg-popover text-popover-foreground shadow-md border whitespace-nowrap text-sm font-medium transition-all duration-200",
                isHovered ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2 pointer-events-none"
              )}
            >
              {section.label}
              <span className="ml-2 text-xs text-muted-foreground">({section.key})</span>
            </div>

            {/* 圆点按钮 */}
            <button
              onClick={() => scrollToSection(section.id)}
              className={cn(
                "w-3 h-3 rounded-full transition-all duration-200 cursor-pointer border-2",
                isActive
                  ? "bg-primary border-primary scale-125 shadow-lg"
                  : "bg-background border-muted-foreground/30 hover:border-primary hover:scale-110"
              )}
              title={`${section.label} (${section.key})`}
              aria-label={`跳转到${section.label}`}
            />
          </div>
        );
      })}

      {/* 键盘提示 */}
      <div className="mt-4 text-xs text-muted-foreground text-right opacity-0 group-hover:opacity-100 transition-opacity">
        按 1-{sections.length} 快速跳转
      </div>
    </div>
  );
}
