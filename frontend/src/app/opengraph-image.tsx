import { ImageResponse } from "next/og";
import { site } from "@/content/site";
import tailwindConfig from "../../tailwind.config";

// Social-share preview used by every public page.
export const alt = `${site.name} — ${site.motto}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Scale = Record<string, string>;
// Brand tokens straight from tailwind.config.ts — no ad-hoc colours.
const colors = tailwindConfig.theme?.extend?.colors as { primary: Scale; accent: Scale; ink: Scale };

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: `linear-gradient(135deg, ${colors.primary["950"]}, ${colors.primary["900"]} 55%, ${colors.primary["700"]})`,
          color: colors.ink.inverse,
        }}
      >
        <div style={{ width: 96, height: 8, borderRadius: 4, background: colors.accent["400"] }} />
        <div style={{ marginTop: 40, fontSize: 76, fontWeight: 700, lineHeight: 1.1 }}>{site.name}</div>
        <div style={{ marginTop: 24, fontSize: 48, fontStyle: "italic", color: colors.accent["300"] }}>{site.motto}</div>
        <div style={{ marginTop: 48, fontSize: 30, color: colors.primary["100"] }}>{site.sections.join("  ·  ")}</div>
      </div>
    ),
    size,
  );
}
