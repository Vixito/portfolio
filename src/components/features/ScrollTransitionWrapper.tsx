import { useEffect, useRef, useMemo, ReactNode, useState } from 'react';
import { gsap } from 'gsap';

interface ScrollTransitionWrapperProps {
  children: ReactNode;
  transitionType: 'default' | 'horizontal_blinds' | 'vertical_blinds' | 'random_grid' | 'column_grid';
  isActive: boolean;
}

function ScrollTransitionWrapper({ children, transitionType, isActive }: ScrollTransitionWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const clipPathId = useMemo(() => `transition-mask-${Math.random().toString(36).substr(2, 9)}`, []);
  const [isRendered, setIsRendered] = useState(isActive);

  useEffect(() => {
    if (transitionType === 'default') {
      setIsRendered(isActive);
      return;
    }

    if (isActive) {
      setIsRendered(true);
    }

    if (!containerRef.current) return;

    const rects = containerRef.current.querySelectorAll(`clipPath#${clipPathId} rect`);
    if (rects.length === 0) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onReverseComplete: () => {
          if (!isActive) {
            setIsRendered(false);
          }
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
          attr: { width: 0.205, height: 0.205 },
          duration: 0.5,
          stagger: 0.02,
          ease: "power1.inOut"
        });
      } else if (transitionType === 'column_grid') {
        gsap.set(rects, { attr: { height: 0 } });
        tl.to(rects, {
          attr: { height: 0.205 },
          duration: 0.8,
          stagger: {
            each: 0.05,
            from: "random",
            grid: "auto"
          },
          ease: "power2.out"
        });
      }

      if (isActive) {
        tl.play();
      } else {
        // Start from end and reverse if not active initially
        tl.progress(1).reverse();
      }
    }, containerRef);

    return () => ctx.revert();
  }, [transitionType, clipPathId, isActive]);

  if (transitionType === 'default') {
    return <>{children}</>;
  }

  return (
    <div 
      className="absolute inset-0 w-full h-full" 
      ref={containerRef}
      style={{
        pointerEvents: isActive ? 'auto' : 'none',
        zIndex: isActive ? 10 : 0
      }}
    >
      <div 
        className="w-full h-full transition-wrapper" 
        style={{
          clipPath: `url(#${clipPathId})`,
          WebkitClipPath: `url(#${clipPathId})`
        }}
      >
        {isRendered && children}
      </div>
      
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <clipPath id={clipPathId} clipPathUnits="objectBoundingBox">
           {(() => {
             if (transitionType === 'horizontal_blinds') {
               return Array.from({ length: 10 }).map((_, i) => (
                 <rect key={i} x="0" y={i * 0.1} width="1" height="0.105" />
               ));
             } else if (transitionType === 'vertical_blinds') {
               return Array.from({ length: 10 }).map((_, i) => (
                 <rect key={i} x={i * 0.1} y="0" width="0.105" height="1" />
               ));
             } else if (transitionType === 'random_grid' || transitionType === 'column_grid') {
               const rects = [];
               for (let r = 0; r < 5; r++) {
                 for (let c = 0; c < 5; c++) {
                   rects.push(
                     <rect key={`${r}-${c}`} x={c * 0.2} y={r * 0.2} width="0.205" height="0.205" />
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
