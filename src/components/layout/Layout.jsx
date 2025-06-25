import Header from './Header';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        <Header />
        <main>
          {children}
        </main>
      </div>
    </div>
  );
} 