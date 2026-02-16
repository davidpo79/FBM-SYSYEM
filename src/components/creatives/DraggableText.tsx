"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export interface DraggableTextProps {
  text: string;
  x: number; // % from right (RTL)
  y: number; // % from top
  fontSize: number; // px
  color: string;
  fontWeight?: string;
  fontFamily?: string;
  fontStyle?: string; // "normal" | "italic"
  textDecoration?: string; // "none" | "underline"
  maxWidth?: string;
  textAlign?: CanvasTextAlign;
  textShadow?: string;
  lineHeight?: number;
  visible?: boolean;
  onDragEnd: (x: number, y: number) => void;
}

const SNAP_THRESHOLD = 1.8; // % threshold for snapping to center

export default function DraggableText({
  text,
  x,
  y,
  fontSize,
  color,
  fontWeight = "bold",
  fontFamily,
  fontStyle = "normal",
  textDecoration = "none",
  maxWidth = "85%",
  textAlign = "center",
  textShadow = "0 2px 8px rgba(0,0,0,0.8)",
  lineHeight = 1.3,
  visible = true,
  onDragEnd,
}: DraggableTextProps) {
  const [pos, setPos] = useState({ x, y });
  const [isDragging, setIsDragging] = useState(false);
  const [snapH, setSnapH] = useState(false);
  const [snapV, setSnapV] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef({ ox: 0, oy: 0 });

  // Calculate centered X based on width
  const widthNum = parseFloat(maxWidth);
  const centeredX = (100 - widthNum) / 2;

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
      let px = Math.max(
        0,
        Math.min(100, ((rect.right - clientX - offsetRef.current.ox) / rect.width) * 100),
      );
      let py = Math.max(
        0,
        Math.min(100, ((clientY - rect.top - offsetRef.current.oy) / rect.height) * 100),
      );

      // Snap to horizontal center
      const isNearCenterX = Math.abs(px - centeredX) < SNAP_THRESHOLD;
      setSnapH(isNearCenterX);
      if (isNearCenterX) px = centeredX;

      // Snap to vertical center (50%)
      const isNearCenterY = Math.abs(py - 50) < SNAP_THRESHOLD;
      setSnapV(isNearCenterY);

      return { px, py };
    },
    [pos, centeredX],
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
      setSnapH(false);
      setSnapV(false);
      const el = dragRef.current;
      if (el) el.releasePointerCapture(e.pointerId);
      onDragEnd(pos.x, pos.y);
    },
    [isDragging, onDragEnd, pos],
  );

  if (!visible) return null;

  // For center-aligned text: use width (not maxWidth) so text-align actually centers
  const useFullWidth = textAlign === "center";

  return (
    <>
      {/* Snap guide lines — rendered as siblings in parent */}
      {isDragging && snapH && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: "50%",
            top: 0,
            bottom: 0,
            width: "1px",
            backgroundColor: "#FF1493",
            opacity: 0.7,
            zIndex: 60,
          }}
        />
      )}
      {isDragging && snapV && (
        <div
          className="absolute pointer-events-none"
          style={{
            top: "50%",
            left: 0,
            right: 0,
            height: "1px",
            backgroundColor: "#FF1493",
            opacity: 0.7,
            zIndex: 60,
          }}
        />
      )}
      <div
        ref={dragRef}
        className="absolute select-none touch-none"
        style={{
          right: `${pos.x}%`,
          top: `${pos.y}%`,
          fontSize: `${fontSize}px`,
          color,
          fontWeight,
          fontFamily: fontFamily || undefined,
          fontStyle,
          textDecoration,
          textShadow,
          direction: "rtl",
          ...(useFullWidth
            ? { width: maxWidth }
            : { maxWidth }),
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
    </>
  );
}
