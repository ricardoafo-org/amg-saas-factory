import { redirect } from 'next/navigation';

// /admin → redirect to today's view (FEAT-014 will populate this)
export default function AdminIndexPage() {
  redirect('/admin/today');
}
