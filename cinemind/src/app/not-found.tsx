import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container" style={{ padding: "80px 0" }}>
      <div className="empty">
        <h2>Sahifa topilmadi</h2>
        <p>Siz izlagan film yoki sahifa mavjud emas.</p>
        <Link href="/search" className="btn btn-primary" style={{ marginTop: 12 }}>
          Filmlarga qaytish
        </Link>
      </div>
    </div>
  );
}
