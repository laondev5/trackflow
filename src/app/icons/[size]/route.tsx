import { ImageResponse } from "next/og";

const ALLOWED = new Set([72, 96, 128, 144, 180, 192, 256, 384, 512]);

export async function GET(req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size: raw } = await params;
  const size = ALLOWED.has(Number(raw)) ? Number(raw) : 192;
  const maskable = new URL(req.url).searchParams.has("maskable");
  const pad = maskable ? size * 0.2 : size * 0.12;
  const glyph = size - pad * 2;

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)",
          borderRadius: maskable ? 0 : size * 0.22,
        }}
      >
        <svg width={glyph} height={glyph} viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="18" height="18" rx="5" stroke="white" strokeWidth="1.8" opacity="0.35" />
          <path d="M7.5 12.5l3 3 6-7" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    ),
    {
      width: size,
      height: size,
      headers: { "Cache-Control": "public, max-age=31536000, immutable" },
    }
  );
}
