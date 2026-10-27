import { redirect } from 'next/navigation';

// A Tutorial megszűnt / átnevezve: a Kisokos (/kisokos) a helye; a régi linkek oda irányítanak át.
export default function Page() {
  redirect('/kisokos');
}
