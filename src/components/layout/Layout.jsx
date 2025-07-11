import Header from './Header';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-1.5 pt-2 pb-8">
        <Header />
        <main>
          {children}
        </main>
      </div>
    </div>
  );
} 