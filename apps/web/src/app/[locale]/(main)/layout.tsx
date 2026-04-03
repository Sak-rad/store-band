import { Header } from '../../../shared/ui/Header';
import { Footer } from '../../../shared/ui/Footer';

interface Props {
  children: React.ReactNode;
  modal: React.ReactNode;
}

export default function MainLayout({ children, modal }: Props) {
  return (
    <>
      <Header />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
      {modal}
      <Footer />
    </>
  );
}
