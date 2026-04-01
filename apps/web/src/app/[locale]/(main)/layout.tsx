import { Header } from '../../../shared/ui/Header';
import { Footer } from '../../../shared/ui/Footer';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
      <Footer />
    </>
  );
}
