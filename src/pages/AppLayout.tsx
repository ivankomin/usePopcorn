import { Outlet } from "react-router";
import Footer from "../components/Footer";
import Header from "../components/Header";

export default function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-main-bg">
      <Header />
      <main className="flex-1 max">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
