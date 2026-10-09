// Preview-only stand-in for next/image.
export default function Image({ src, alt, width, height, fill, priority: _p, unoptimized: _u, sizes: _s, quality: _q, placeholder: _ph, ...props }) {
  const style = fill ? { position: "absolute", inset: 0, width: "100%", height: "100%", ...props.style } : props.style;
  return <img src={typeof src === "string" ? src : src?.src} alt={alt} width={fill ? undefined : width} height={fill ? undefined : height} {...props} style={style} />;
}
