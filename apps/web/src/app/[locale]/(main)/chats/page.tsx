import type { Metadata } from 'next';
import { ChatList } from '../../../../features/chat/ui/ChatList';

export const metadata: Metadata = { title: 'Messages' };

export default async function ChatsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <ChatList locale={locale} />;
}
