"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export interface DraggableCTAProps {
  text: string;
  x: number; // % from right
  y: number; // % from top
  bgColor: string;
  textColor: string;
  borderRadius?: number;
  fontSize?: number;
  padding?: string;
  shadow?: string;
  visible?: boolean;
  onDragEnd: (x: number, y: number) => void;
}

export default function DraggableCTA({
  text,
  x,
  y,
  bgColor,
  textColor,
  borderRadius = 25,
  fontSize = 14,
  padding = "10px 28px",
  shadow = "0 4px 12px rgba(0,0,0,0.4)",
  visible = true,
  onDragEnd,
}: DraggableCTAProps) {
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
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div
        style={{
          backgroundColor: bgColor,
          color: textColor,
          borderRadius: `${borderRadius}px`,
          padding,
          fontSize: `${fontSize}px`,
          fontWeight: "bold",
          textAlign: "center",
          whiteSpace: "nowrap",
          boxShadow: shadow,
          direction: "rtl",
        }}
      >
        {text}
      </div>
    </div>
  );
}
