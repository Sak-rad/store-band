import { ChatWindow } from '@/widgets/chat';

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

export default async function ChatPage({ params }: Props) {
  const { id } = await params;
  return <ChatWindow chatId={id} />;
}