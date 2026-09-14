import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(160deg, #c95f36 0%, #9c3f1e 100%)",
          borderRadius: 110,
          color: "#fff6ee",
          fontSize: 300,
          fontWeight: 700,
          fontFamily: "sans-serif",
          letterSpacing: -12,
        }}
      >
        L
      </div>
    ),
    size,
  );
}
