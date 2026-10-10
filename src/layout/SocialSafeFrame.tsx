import type { PropsWithChildren } from "react";
import { useVideoConfig } from "remotion";
import { socialFrame } from "./videoFormat";

export const SocialSafeFrame: React.FC<PropsWithChildren<{ enabled: boolean }>> = ({ enabled, children }) => {
  const { width, height } = useVideoConfig();
  const frame = socialFrame(width, height, enabled);
  return <div style={{
    position: "absolute",
    width,
    height,
    left: frame.left,
    top: frame.top,
    scale: frame.scale,
    transformOrigin: "0 0",
  }}>{children}</div>;
};
