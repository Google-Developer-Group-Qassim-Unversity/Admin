"use client";

import * as React from "react";

/**
 * Renders email HTML at a fixed phone viewport (375 x 667 by default) and
 * scales it down to the container's width when that is narrower - so the
 * preview inside a 360px bottom sheet shows the whole email the way a phone
 * would, instead of overflowing sideways. Never scales up.
 */
export function ScaledEmailFrame({
  srcDoc,
  title,
  width = 375,
  height = 667,
  className,
}: {
  srcDoc: string;
  title: string;
  width?: number;
  height?: number;
  className?: string;
}) {
  const boxRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(1);

  React.useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const update = () => setScale(Math.min(1, box.clientWidth / width));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(box);
    return () => ro.disconnect();
  }, [width]);

  return (
    <div ref={boxRef} dir="ltr" className={className} style={{ width: "100%", maxWidth: width }}>
      <div style={{ height: height * scale, overflow: "hidden" }}>
        <iframe
          srcDoc={srcDoc}
          title={title}
          sandbox="allow-same-origin"
          className="block border-0 bg-white"
          style={{ width, height, transform: `scale(${scale})`, transformOrigin: "top left" }}
        />
      </div>
    </div>
  );
}
