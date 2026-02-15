"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export interface DraggableProfileProps {
  name: string;
  role: string;
  image?: string; // base64 or URL
  accentColor?: string;
  x: number;
  y: number;
  visible?: boolean;
  onDragEnd: (x: number, y: number) => void;
}

export default function DraggableProfile({
  name,
  role,
  image,
  accentColor = "#FFD700",
  x,
  y,
  visible = true,
  onDragEnd,
}: DraggableProfileProps) {
  const [pos, setPos] = useState({ x, y });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef({ ox: 0, oy: 0 });

  useEffect(() => {
    if (!isDragging) setPos({ x, y });
  }, [x, y, isDragging]);

  const getPercent = useCallback(
    (clientX: number, clientY: number) => {
      const parent = dragRef.current?.parentElement;
      if (!parent) return { px: pos.x, py: pos.y };
      const rect = parent.getBoundingClientRect();
      const px = Math.max(
        0,
        Math.min(100, ((rect.right - clientX - offsetRef.current.ox) / rect.width) * 100),
      );
      const py = Math.max(
        0,
        Math.min(100, ((clientY - rect.top - offsetRef.current.oy) / rect.height) * 100),
      );
      return { px, py };
    },
    [pos],
  );

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    const el = dragRef.current;
    if (!el) return;
    el.setPointerCapture(e.pointerId);
    const rect = el.getBoundingClientRect();
    offsetRef.current = {
      ox: rect.right - e.clientX,
      oy: e.clientY - rect.top,
    };
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      const { px, py } = getPercent(e.clientX, e.clientY);
      setPos({ x: px, y: py });
    },
    [isDragging, getPercent],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      setIsDragging(false);
      const el = dragRef.current;
      if (el) el.releasePointerCapture(e.pointerId);
      onDragEnd(pos.x, pos.y);
    },
    [isDragging, onDragEnd, pos],
  );

  if (!visible) return null;

  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2);

  return (
    <div
      ref={dragRef}
      className="absolute select-none touch-none"
      style={{
        right: `${pos.x}%`,
        top: `${pos.y}%`,
        cursor: isDragging ? "grabbing" : "grab",
        outline: isDragging ? "2px dashed rgba(212,168,67,0.8)" : "none",
        outlineOffset: "4px",
        borderRadius: "4px",
        zIndex: isDragging ? 50 : "auto",
        userSelect: "none",
        direction: "rtl",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div className="flex items-center gap-2">
        {image ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={image}
            alt=""
            className="w-10 h-10 rounded-full object-cover"
            style={{ border: `3px solid ${accentColor}` }}
          />
        ) : (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
            style={{
              border: `3px solid ${accentColor}`,
              backgroundColor: "rgba(255,255,255,0.15)",
            }}
          >
            {initials}
          </div>
        )}
        <div>
          <p
            className="text-white text-xs font-bold leading-tight"
            style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}
          >
            {name}
          </p>
          <p
            className="text-white/70 text-[10px] leading-tight"
            style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}
          >
            {role}
          </p>
        </div>
      </div>
    </div>
  );
}
