"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export interface DraggableTextProps {
  text: string;
  x: number; // % from right (RTL)
  y: number; // % from top
  fontSize: number; // px
  color: string;
  fontWeight?: string;
  maxWidth?: string;
  textAlign?: CanvasTextAlign;
  textShadow?: string;
  lineHeight?: number;
  visible?: boolean;
  onDragEnd: (x: number, y: number) => void;
}

export default function DraggableText({
  text,
  x,
  y,
  fontSize,
  color,
  fontWeight = "bold",
  maxWidth = "85%",
  textAlign = "center",
  textShadow = "0 2px 8px rgba(0,0,0,0.8)",
  lineHeight = 1.3,
  visible = true,
  onDragEnd,
}: DraggableTextProps) {
  const [pos, setPos] = useState({ x, y });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef({ ox: 0, oy: 0 });

  // Sync external position changes
  useEffect(() => {
    if (!isDragging) setPos({ x, y });
  }, [x, y, isDragging]);

  const getPercent = useCallback(
    (clientX: number, clientY: number) => {
      const parent = dragRef.current?.parentElement;
      if (!parent) return { px: pos.x, py: pos.y };
      const rect = parent.getBoundingClientRect();
      // RTL: measure from right edge
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

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      const el = dragRef.current;
      if (!el) return;
      el.setPointerCapture(e.pointerId);
      const rect = el.getBoundingClientRect();
      // Offset from the point of click to the element's edge
      offsetRef.current = {
        ox: rect.right - e.clientX,
        oy: e.clientY - rect.top,
      };
    },
    [],
  );

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
        fontSize: `${fontSize}px`,
        color,
        fontWeight,
        textShadow,
        direction: "rtl",
        maxWidth,
        textAlign,
        lineHeight,
        whiteSpace: "pre-wrap",
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
      {text}
    </div>
  );
}
