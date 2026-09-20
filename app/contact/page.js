export const metadata = { title: 'Kapcsolat - Titkosírás' };

export default function ContactPage() {
  return (
    <div className="wrap">
      <h1 className="page-title">Kapcsolat</h1>
      <div className="card">
        <p style={{ fontSize: 15, lineHeight: 1.6 }}>
          Kérdésed, ötleted vagy hibajelentésed van? Írj nekünk bátran!
        </p>
        <a className="mail-link" href="mailto:napititkos@gmail.com">
          napititkos@gmail.com
        </a>
      </div>
    </div>
  );
}
