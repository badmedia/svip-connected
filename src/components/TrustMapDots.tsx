import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const colleges = [
  { name: "RVCE", x: 20, y: 30 },
  { name: "PESU", x: 60, y: 45 },
  { name: "BMS", x: 40, y: 70 },
  { name: "MSRIT", x: 75, y: 25 },
  { name: "CMRIT", x: 85, y: 60 },
  { name: "NIE", x: 15, y: 80 },
];

export const TrustMapDots = () => {
  const [activeDots, setActiveDots] = useState<number[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveDots(
        colleges.map((_, i) => i).filter(() => Math.random() > 0.3)
      );
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-[400px] bg-gradient-to-br from-primary/5 to-accent/5 rounded-3xl overflow-hidden glass-card">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center space-y-2 opacity-20">
          <p className="text-6xl font-bold text-primary">Bengaluru</p>
          <p className="text-lg text-muted-foreground">Student Network Map</p>
        </div>
      </div>
      
      {colleges.map((college, i) => (
        <div
          key={i}
          className="absolute transition-all duration-1000"
          style={{
            left: `${college.x}%`,
            top: `${college.y}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <div
            className={cn(
              "relative flex items-center justify-center transition-all duration-1000",
              activeDots.includes(i) ? "animate-glow-pulse" : ""
            )}
          >
            {/* Glow ring */}
            <div
              className={cn(
                "absolute w-16 h-16 rounded-full bg-primary/20 blur-xl transition-all duration-1000",
                activeDots.includes(i) ? "scale-150 opacity-100" : "scale-100 opacity-0"
              )}
            />
            
            {/* Dot */}
            <div
              className={cn(
                "w-4 h-4 rounded-full bg-gradient-to-br from-primary to-primary-glow shadow-lg transition-all duration-300",
                activeDots.includes(i) ? "scale-125 trust-glow" : "scale-100"
              )}
            />
            
            {/* Label */}
            <div
              className={cn(
                "absolute top-6 whitespace-nowrap bg-card/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-medium shadow-md transition-all duration-300",
                activeDots.includes(i) ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
              )}
            >
              {college.name}
            </div>
          </div>
        </div>
      ))}
      
      {/* Connection lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {activeDots.map((dotIndex, i) => {
          if (i === 0) return null;
          const from = colleges[activeDots[i - 1]];
          const to = colleges[dotIndex];
          return (
            <line
              key={`${dotIndex}-${i}`}
              x1={`${from.x}%`}
              y1={`${from.y}%`}
              x2={`${to.x}%`}
              y2={`${to.y}%`}
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              strokeOpacity="0.3"
              className="animate-fade-in"
            />
          );
        })}
      </svg>
    </div>
  );
};
