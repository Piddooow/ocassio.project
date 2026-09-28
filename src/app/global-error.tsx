"use client";

/**
 * Global error boundary for failures above the root layout.
 * Uses inline styles because global CSS may not have loaded.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#FAFAFA",
          color: "#171717",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "24px",
        }}
      >
        <p
          style={{
            fontSize: 12,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#737373",
          }}
        >
          Something went wrong
        </p>
        <h1 style={{ marginTop: 24, fontSize: 32, fontWeight: 400 }}>
          The site could not be loaded.
        </h1>
        <p style={{ marginTop: 16, maxWidth: 420, color: "#525252" }}>
          A critical error interrupted the application. Trying again usually
          fixes it.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: 40,
            height: 44,
            padding: "0 20px",
            borderRadius: 9999,
            border: "none",
            background: "#171717",
            color: "#FAFAFA",
            fontSize: 15,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
