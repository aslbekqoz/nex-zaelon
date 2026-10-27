import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container" style={{ padding: "80px 0" }}>
      <div className="empty">
        <h2>Page not found</h2>
        <p>The movie or page you’re looking for doesn’t exist.</p>
        <Link href="/search" className="btn btn-primary" style={{ marginTop: 12 }}>
          Back to movies
        </Link>
      </div>
    </div>
  );
}
