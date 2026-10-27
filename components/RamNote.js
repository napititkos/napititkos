'use client';

// A kos üzenete a lapon (nem felugró): a feladat bevezetője, ha már láttad (vagy megoldottad
// a feladatot), itt olvasható újra. Ugyanúgy néz ki, mint a felugró kos-üzenet.
export default function RamNote({ children }) {
  return (
    <div className="ram-note">
      <img className="coach-ram" src="/logo-96.png" alt="" aria-hidden="true" width={36} height={36} />
      <div className="coach-bubble ram-note-bubble">
        <CoachTail />
        <div className="coach-text">{children}</div>
      </div>
    </div>
  );
}

// A buborék "farka" a kos feje felé (balra), ugyanolyan lágy ívvel, mint az értesítés-doboz
// nyúlványa: a buborék kerete folytatólagosan fut ki és vissza.
export function CoachTail() {
  return (
    <svg className="coach-tail" width="13" height="24" viewBox="0 0 13 24" aria-hidden="true">
      <path className="coach-tail-fill" d="M13 0 L12 0 C12 5 9.5 7.5 5.5 9.5 Q0.5 12 5.5 14.5 C9.5 16.5 12 19 12 24 L13 24 Z" />
      <path className="coach-tail-line" d="M12 0 C12 5 9.5 7.5 5.5 9.5 Q0.5 12 5.5 14.5 C9.5 16.5 12 19 12 24" />
    </svg>
  );
}
