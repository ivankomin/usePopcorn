import { Link, NavLink } from "react-router";
import { Search as SearchIcon, Book, User, LogOut } from "lucide-react";

export default function Header() {
  const navLinkStyles = ({ isActive }: { isActive: boolean }) =>
    `text-lg font-semibold transition-all pb-1 border-b-4 ${
      isActive
        ? "text-body-text border-accent"
        : "text-grey border-transparent hover:text-body-text"
    }`;

  return (
    <nav className="bg-light-bg border-lighter-bg flex items-center justify-between px-10 py-5">
      <div className="flex items-center gap-14">
        <Link
          className="flex items-baseline gap-1 font-bold tracking-tighter"
          to="/"
        >
          <span className="text-body-text font-geist text-4xl uppercase">Use</span>
          <span className="text-6xl">🍿</span>
        </Link>

        <div className="mt-2 flex items-center gap-20">
          <NavLink className={navLinkStyles} to="/">
            Home
          </NavLink>
          <NavLink className={navLinkStyles} to="/movies">
            Movies
          </NavLink>
          <NavLink className={navLinkStyles} to="/series">
            Series
          </NavLink>
        </div>
      </div>

      <div className="mr-12 ml-auto w-100">
        <div className="group relative">
          <SearchIcon className="text-grey group-focus-within:text-accent absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 transition-colors" />
          <input
            type="text"
            placeholder="Search..."
            className="bg-lighter-bg text-body-text focus:border-grey-lighter placeholder:text-grey/50 w-full rounded-xl border border-transparent py-2.5 pr-4 pl-12 transition-all outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-8">
        <NavLink
          to="/watchlist"
          className={({ isActive }) =>
            `flex items-center gap-2 transition-colors ${
              isActive ? "text-accent" : "text-body-text hover:text-accent"
            }`
          }
        >
          <Book className="h-6 w-6" />
          <span className="text-lg font-medium">Watchlist</span>
        </NavLink>

        <div className="border-lighter-bg flex items-center gap-6 border-l pl-8">
          <button className="text-body-text hover:text-accent transition-colors">
            <User className="h-7 w-7" />
          </button>

          <button className="text-grey hover:text-body-text transition-colors">
            <LogOut className="h-7 w-7" />
          </button>
        </div>
      </div>
    </nav>
  );
}
