"use client";

import * as React from "react";

import { sanitizeHtml } from "./email-composer-utils";

/**
 * Renders email HTML at a fixed viewport width (a 375px phone by default, or
 * a 1024px desktop) and scales it down to the container's width when that is
 * narrower - so a 360px bottom sheet shows the whole email the way that screen
 * would, instead of overflowing sideways. Never scales up.
 *
 * `height` is the viewport's height before scaling; `fillHeight` instead makes
 * the frame as tall as its container (give the container a height).
 */
export function ScaledEmailFrame({
  srcDoc,
  title,
  width = 375,
  height = 667,
  fillHeight = false,
  className,
}: {
  srcDoc: string;
  title: string;
  width?: number;
  height?: number;
  fillHeight?: boolean;
  className?: string;
}) {
  const safeHtml = React.useMemo(() => typeof window === "undefined" ? "" : sanitizeHtml(srcDoc), [srcDoc]);
  const boxRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(1);
  const [boxHeight, setBoxHeight] = React.useState(0);

  React.useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const update = () => {
      setScale(Math.min(1, box.clientWidth / width));
      setBoxHeight(box.clientHeight);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(box);
    return () => ro.disconnect();
  }, [width]);

  const frameHeight = fillHeight ? boxHeight / scale : height;

  return (
    <div
      ref={boxRef}
      dir="ltr"
      className={className}
      style={{ width: "100%", maxWidth: width, height: fillHeight ? "100%" : undefined }}
    >
      <div style={{ height: fillHeight ? "100%" : height * scale, overflow: "hidden" }}>
        <iframe
          srcDoc={safeHtml}
          title={title}
          sandbox=""
          className="block border-0 bg-white"
          style={{ width, height: frameHeight, transform: `scale(${scale})`, transformOrigin: "top left" }}
        />
      </div>
    </div>
  );
}
