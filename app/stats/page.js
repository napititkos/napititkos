import { redirect } from 'next/navigation';

// A Statisztikáim oldal megszűnt: a statisztikák a Profilom oldalon vannak. A régi linkek
// (könyvjelzők) oda irányítanak át.
export default function StatsPage() {
  redirect('/account');
}
