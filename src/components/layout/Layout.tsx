function Layout({ children }) {
  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 grid-background z-0"></div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export default Layout;
