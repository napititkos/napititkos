// "Nézz utána!" a tipp-ablakban: az admin által megadott ismeretterjesztő segítség (szöveg
// és/vagy link). Nem számít tippnek, kérés nélkül, mindig látszik, ha meg van adva.
export default function LookupHint({ lookup }) {
  if (!lookup || (!lookup.text && !lookup.url)) return null;
  // A szerver már csak http(s) linket enged át; itt is ellenőrizzük, a biztonság kedvéért.
  const url = /^https?:\/\//i.test(lookup.url || '') ? lookup.url : '';
  let host = '';
  try {
    host = url ? new URL(url).hostname.replace(/^www\./, '') : '';
  } catch {}
  return (
    <div className="lookup-hint">
      <div className="lookup-hint-title">🔎 Nézz utána!</div>
      {lookup.text && <p>{lookup.text}</p>}
      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer">
          Olvass utána{host ? ` (${host})` : ''} ↗
        </a>
      )}
    </div>
  );
}
