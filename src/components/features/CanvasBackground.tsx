import { useEffect, useRef } from 'react';

interface CanvasBackgroundProps {
  mode: 'light' | 'dark';
}

function CanvasBackground({ mode }: CanvasBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;

    if (height < 400) height = 400;

    canvas.width = width;
    canvas.height = height;

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      if (height < 400) height = 400;
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener('resize', handleResize);

    // Terrain class
    class Terrain {
      terrainCanvas: HTMLCanvasElement;
      terCtx: CanvasRenderingContext2D;
      scrollDelay: number;
      lastScroll: number;
      fillStyle: string;
      mHeight: number;
      points: number[];

      constructor(options: any) {
        this.terrainCanvas = document.createElement("canvas");
        this.terCtx = this.terrainCanvas.getContext("2d")!;
        this.scrollDelay = options.scrollDelay || 90;
        this.lastScroll = Date.now();
        
        this.terrainCanvas.width = width;
        this.terrainCanvas.height = height;
        this.fillStyle = options.fillStyle || "#191D4C";
        this.mHeight = options.mHeight || height;

        this.points = [];
        let displacement = options.displacement || 140;
        const power = Math.pow(2, Math.ceil(Math.log(width) / (Math.log(2))));

        this.points[0] = this.mHeight;
        this.points[power] = this.points[0];

        for (let i = 1; i < power; i *= 2) {
          for (let j = (power / i) / 2; j < power; j += power / i) {
            this.points[j] = ((this.points[j - (power / i) / 2] + this.points[j + (power / i) / 2]) / 2) + Math.floor(Math.random() * -displacement + displacement);
          }
          displacement *= 0.6;
        }
      }

      update() {
        this.terCtx.clearRect(0, 0, width, height);
        this.terCtx.fillStyle = this.fillStyle;
        
        if (Date.now() > this.lastScroll + this.scrollDelay) {
          this.lastScroll = Date.now();
          const first = this.points.shift();
          if (first !== undefined) this.points.push(first);
        }

        this.terCtx.beginPath();
        for (let i = 0; i <= width; i++) {
          if (i === 0) {
            this.terCtx.moveTo(0, this.points[0]);
          } else if (this.points[i] !== undefined) {
            this.terCtx.lineTo(i, this.points[i]);
          }
        }

        this.terCtx.lineTo(width, this.terrainCanvas.height);
        this.terCtx.lineTo(0, this.terrainCanvas.height);
        this.terCtx.lineTo(0, this.points[0]);
        this.terCtx.fill();
        
        ctx!.drawImage(this.terrainCanvas, 0, 0);
      }
    }

    class Star {
      size: number;
      speed: number;
      x: number;
      y: number;
      
      constructor(options: any) {
        this.size = Math.random() * 2;
        this.speed = Math.random() * 0.05;
        this.x = options.x;
        this.y = options.y;
      }
      
      reset() {
        this.size = Math.random() * 2;
        this.speed = Math.random() * 0.05;
        this.x = width;
        this.y = Math.random() * height;
      }
      
      update() {
        this.x -= this.speed;
        if (this.x < 0) {
          this.reset();
        } else {
          ctx!.fillRect(this.x, this.y, this.size, this.size);
        }
      }
    }

    class ShootingStar {
      x!: number;
      y!: number;
      len!: number;
      speed!: number;
      size!: number;
      waitTime!: number;
      active!: boolean;
      
      constructor() {
        this.reset();
      }
      
      reset() {
        this.x = Math.random() * width;
        this.y = 0;
        this.len = (Math.random() * 80) + 10;
        this.speed = (Math.random() * 10) + 6;
        this.size = (Math.random() * 1) + 0.1;
        this.waitTime = Date.now() + (Math.random() * 3000) + 500;
        this.active = false;
      }
      
      update() {
        if (this.active) {
          this.x -= this.speed;
          this.y += this.speed;
          if (this.x < 0 || this.y >= height) {
            this.reset();
          } else {
            ctx!.lineWidth = this.size;
            ctx!.beginPath();
            ctx!.moveTo(this.x, this.y);
            ctx!.lineTo(this.x + this.len, this.y - this.len);
            ctx!.stroke();
          }
        } else {
          if (this.waitTime < Date.now()) {
            this.active = true;
          }
        }
      }
    }

    const entities: any[] = [];
    
    if (mode === 'dark') {
      for (let i = 0; i < height; i++) {
        entities.push(new Star({ x: Math.random() * width, y: Math.random() * height }));
      }
      entities.push(new ShootingStar());
      entities.push(new ShootingStar());
      entities.push(new Terrain({mHeight: (height/2)-120, fillStyle: "#191D4C"}));
      entities.push(new Terrain({displacement: 120, scrollDelay: 50, fillStyle: "rgb(17,20,40)", mHeight: (height/2)-60}));
      entities.push(new Terrain({displacement: 100, scrollDelay: 20, fillStyle: "rgb(10,10,5)", mHeight: height/2}));
    } else {
      entities.push(new Terrain({displacement: 120, scrollDelay: 50, fillStyle: "#A3D2CA", mHeight: (height/2)-120}));
      entities.push(new Terrain({displacement: 100, scrollDelay: 20, fillStyle: "#5EAAA8", mHeight: (height/2)-60}));
      entities.push(new Terrain({displacement: 80, scrollDelay: 10, fillStyle: "#05668D", mHeight: height/2}));
    }

    const animate = () => {
      if (mode === 'dark') {
        ctx!.fillStyle = '#110E19';
        ctx!.fillRect(0, 0, width, height);
        ctx!.fillStyle = '#ffffff';
        ctx!.strokeStyle = '#ffffff';
      } else {
        ctx!.fillStyle = '#F0F8FF'; // AliceBlue
        ctx!.fillRect(0, 0, width, height);
        ctx!.fillStyle = '#ffffff';
        ctx!.strokeStyle = '#ffffff';
      }

      for (let i = 0; i < entities.length; i++) {
        entities[i].update();
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [mode]);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
      style={{ opacity: 0.6 }} // Ajuste de opacidad para no opacar el contenido
    />
  );
}

export default CanvasBackground;
