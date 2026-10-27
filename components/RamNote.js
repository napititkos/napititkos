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
  // 15 px széles: a jobb széle (13-15) a buborék 2 px-es keretét takarja, a vonal pedig a keret
  // közepéből (x = 13) indul ki és oda fut vissza, így a két vonal pontosan összeér.
  return (
    <svg className="coach-tail" width="15" height="24" viewBox="0 0 15 24" aria-hidden="true">
      <path className="coach-tail-fill" d="M15 0 L13 0 C13 5 10.5 7.5 6.5 9.5 Q1.5 12 6.5 14.5 C10.5 16.5 13 19 13 24 L15 24 Z" />
      <path className="coach-tail-line" d="M13 0 C13 5 10.5 7.5 6.5 9.5 Q1.5 12 6.5 14.5 C10.5 16.5 13 19 13 24" />
    </svg>
  );
}
