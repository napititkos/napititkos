// Vendégeknek: rövid szöveg, alatta középen egymás mellett a Bejelentkezés és a Regisztráció gomb
// (a regisztráció a belépés oldalán egyből a regisztrációs fülön nyílik). callbackUrl: ide tér vissza.
export default function AuthPrompt({ children, callbackUrl = '/' }) {
  const cb = encodeURIComponent(callbackUrl);
  return (
    <div className="auth-prompt">
      {children}
      <div className="auth-prompt-btns">
        <a className="auth-prompt-btn primary" href={`/login?callbackUrl=${cb}`}>
          Bejelentkezés
        </a>
        <a className="auth-prompt-btn ghost" href={`/login?mode=register&callbackUrl=${cb}`}>
          Regisztráció
        </a>
      </div>
    </div>
  );
}
