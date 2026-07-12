import { useEffect, useRef, useMemo, ReactNode } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface ScrollTransitionWrapperProps {
  children: ReactNode;
  transitionType: 'default' | 'horizontal_blinds' | 'vertical_blinds' | 'random_grid' | 'column_grid';
}

function ScrollTransitionWrapper({ children, transitionType }: ScrollTransitionWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const clipPathId = useMemo(() => `transition-mask-${Math.random().toString(36).substr(2, 9)}`, []);

  useEffect(() => {
    if (transitionType === 'default' || !containerRef.current) return;

    const rects = containerRef.current.querySelectorAll(`clipPath#${clipPathId} rect`);
    if (rects.length === 0) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 85%",
        end: "bottom 15%",
        toggleActions: "play reverse play reverse",
      }
    });

    if (transitionType === 'horizontal_blinds') {
      gsap.set(rects, { attr: { width: 0 } });
      tl.to(rects, {
        attr: { width: 1 },
        duration: 1,
        stagger: 0.1,
        ease: "power2.inOut"
      });
    } else if (transitionType === 'vertical_blinds') {
      gsap.set(rects, { attr: { height: 0 } });
      tl.to(rects, {
        attr: { height: 1 },
        duration: 1,
        stagger: 0.1,
        ease: "power2.inOut"
      });
    } else if (transitionType === 'random_grid') {
      gsap.set(rects, { attr: { width: 0, height: 0 } });
      
      const rectsArray = gsap.utils.toArray(rects);
      const shuffled = rectsArray.sort(() => 0.5 - Math.random());
      
      tl.to(shuffled, {
        attr: { width: 0.2, height: 0.2 },
        duration: 0.5,
        stagger: 0.02,
        ease: "power1.inOut"
      });
    } else if (transitionType === 'column_grid') {
      gsap.set(rects, { attr: { height: 0 } });
      tl.to(rects, {
        attr: { height: 0.2 },
        duration: 0.8,
        stagger: {
          each: 0.05,
          from: "random",
          grid: "auto"
        },
        ease: "power2.out"
      });
    }

    return () => {
      tl.kill();
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, [transitionType, clipPathId]);

  if (transitionType === 'default') {
    return <>{children}</>;
  }

  return (
    <div className="relative w-full h-full" ref={containerRef}>
      <div 
        className="w-full h-full transition-wrapper" 
        style={{
          clipPath: `url(#${clipPathId})`,
          WebkitClipPath: `url(#${clipPathId})`
        }}
      >
        {children}
      </div>
      
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <clipPath id={clipPathId} clipPathUnits="objectBoundingBox">
           {(() => {
             if (transitionType === 'horizontal_blinds') {
               return Array.from({ length: 10 }).map((_, i) => (
                 <rect key={i} x="0" y={i * 0.1} width="1" height="0.1" />
               ));
             } else if (transitionType === 'vertical_blinds') {
               return Array.from({ length: 10 }).map((_, i) => (
                 <rect key={i} x={i * 0.1} y="0" width="0.1" height="1" />
               ));
             } else if (transitionType === 'random_grid' || transitionType === 'column_grid') {
               const rects = [];
               for (let r = 0; r < 5; r++) {
                 for (let c = 0; c < 5; c++) {
                   rects.push(
                     <rect key={`${r}-${c}`} x={c * 0.2} y={r * 0.2} width="0.2" height="0.2" />
                   );
                 }
               }
               return rects;
             }
           })()}
        </clipPath>
      </svg>
    </div>
  );
}

export default ScrollTransitionWrapper;
