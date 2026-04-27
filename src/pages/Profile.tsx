import {
  Mail,
  Calendar,
  Film,
  Star,
  List,
  Settings,
  LogOut,
  ChevronRight,
  PlusSquare,
  ShieldCheck,
  Users,
  Database,
  BarChart3,
  MessageSquare
} from "lucide-react";
import { Link } from "react-router";
import { useWatchlist } from "../contexts/WatchlistContext.tsx";

export default function Profile() {
  const { watchlist } = useWatchlist();

  // Hardcoded Admin Switch
  const isAdmin = true;

  const user = {
    username: "TheOneAndOnly67",
    email: "deltaruning_it1225@gmail.com",
    joinedDate: "December 2025",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=1237",
    stats: {
      watched: 124,
      avgRating: 8.4,
      reviews: 42,
    },
  };

  return (
    <div className="bg-main-bg min-h-screen p-6 md:p-12">
      <div className="mx-auto max-w-5xl">
        {/* Header Profile Section */}
        <div className="bg-light-bg mb-8 rounded-3xl p-8 shadow-2xl md:p-10">
          <div className="flex flex-col items-center gap-8 md:flex-row md:items-start">
            <div className="relative">
              <div className="from-accent/20 to-accent/5 absolute -inset-2 rounded-full bg-linear-to-tr blur-lg" />
              <img
                src={user.avatar}
                alt="Profile"
                className="relative h-32 w-32 rounded-full border-4 border-neutral-800 bg-[#141414] object-cover md:h-40 md:w-40"
              />
              <button className="bg-accent text-light-bg absolute right-1 bottom-1 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-4 border-neutral-900 transition-transform hover:scale-110">
                <Settings size={18} />
              </button>
            </div>

            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col items-center gap-3 md:flex-row md:items-baseline">
                <h1 className="text-4xl font-black tracking-tight text-white md:text-5xl">
                  {user.username}
                </h1>
                {/* Admin Badge */}
                {isAdmin && (
                  <span className="flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-accent shadow-[0_0_15px_rgba(180,244,77,0.1)]">
                    <ShieldCheck size={12} />
                    Administrator
                  </span>
                )}
              </div>

              <div className="mt-4 flex flex-wrap justify-center gap-4 text-neutral-400 md:justify-start">
                <div className="flex items-center gap-2">
                  <Mail size={16} className="text-accent" />
                  <span className="text-sm font-medium">{user.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-accent" />
                  <span className="text-sm font-medium">Joined {user.joinedDate}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-wrap justify-center gap-3 md:justify-start">
                {/* Admin Specific Buttons */}
                {isAdmin && (
                  <>
                    <Link to='/add-movie' className="bg-white text-black flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold transition-all hover:bg-neutral-200 active:scale-95">
                      <PlusSquare size={18} />
                      Add Movie
                    </Link>
                    <Link to='/curate' className="bg-neutral-800 text-white border border-neutral-700 flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold transition-all hover:bg-neutral-700 active:scale-95">
                      <MessageSquare size={18} />
                      Curate Reviews
                    </Link>
                  </>
                )}

                <Link
                  to="/watchlist"
                  className={`${isAdmin ? 'bg-accent/10 text-accent border border-accent/20' : 'bg-accent text-light-bg'} flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold transition-all hover:brightness-110 active:scale-95`}
                >
                  <List size={18} strokeWidth={2.5} />
                  My Watchlist
                </Link>
                
                <button className="flex items-center gap-2 rounded-xl border border-neutral-700 bg-[#141414] px-6 py-3 text-sm font-bold text-white transition-colors hover:border-red-500/50 hover:text-red-500">
                  <LogOut size={18} />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Sidebar Area */}
          <div className="space-y-8">
            {/* Admin Management Sidebar Section */}
            {isAdmin && (
              <div className="bg-light-bg rounded-3xl border border-accent/20 p-6 shadow-[0_0_30px_rgba(180,244,77,0.05)]">
                <h3 className="mb-6 text-xs font-extrabold tracking-widest text-accent uppercase flex items-center gap-2">
                  <ShieldCheck size={14} />
                  Management
                </h3>
                <div className="space-y-4">
                  <button className="group flex w-full items-center justify-between rounded-xl bg-[#141414] p-3 transition-colors hover:bg-neutral-800">
                    <div className="flex items-center gap-3">
                      <Users size={16} className="text-neutral-500 group-hover:text-white" />
                      <span className="text-sm font-bold text-neutral-300">User DB</span>
                    </div>
                    <ChevronRight size={14} className="text-neutral-600" />
                  </button>
                  <button className="group flex w-full items-center justify-between rounded-xl bg-[#141414] p-3 transition-colors hover:bg-neutral-800">
                    <div className="flex items-center gap-3">
                      <Database size={16} className="text-neutral-500 group-hover:text-white" />
                      <span className="text-sm font-bold text-neutral-300">API Logs</span>
                    </div>
                    <ChevronRight size={14} className="text-neutral-600" />
                  </button>
                  <button className="group flex w-full items-center justify-between rounded-xl bg-[#141414] p-3 transition-colors hover:bg-neutral-800">
                    <div className="flex items-center gap-3">
                      <BarChart3 size={16} className="text-neutral-500 group-hover:text-white" />
                      <span className="text-sm font-bold text-neutral-300">Platform Stats</span>
                    </div>
                    <ChevronRight size={14} className="text-neutral-600" />
                  </button>
                </div>
              </div>
            )}

            {/* Standard Stats Area */}
            <div className="bg-light-bg rounded-3xl border border-neutral-800/50 p-6">
              <h3 className="mb-6 text-xs font-extrabold tracking-widest text-neutral-500 uppercase">
                Activity Stats
              </h3>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-accent/10 flex h-10 w-10 items-center justify-center rounded-xl">
                      <Film size={20} className="text-accent" />
                    </div>
                    <span className="text-sm font-medium text-neutral-300">Watched</span>
                  </div>
                  <span className="text-xl font-bold text-white">{user.stats.watched}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/10">
                      <Star size={20} className="text-yellow-500" />
                    </div>
                    <span className="text-sm font-medium text-neutral-300">Avg. Rating</span>
                  </div>
                  <span className="text-xl font-bold text-white">{user.stats.avgRating}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                      <List size={20} className="text-blue-500" />
                    </div>
                    <span className="text-sm font-medium text-neutral-300">Watchlist</span>
                  </div>
                  <span className="text-xl font-bold text-white">{watchlist.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Activity Area */}
          <div className="lg:col-span-2">
            <div className="bg-light-bg h-full rounded-3xl border border-neutral-800/50 p-8">
              <div className="mb-8 flex items-center justify-between">
                <h3 className="text-xs font-extrabold tracking-widest text-neutral-500 uppercase">
                  Favorite Genres
                </h3>
                <span className="text-accent text-[10px] font-bold tracking-widest uppercase">
                  Based on your ratings
                </span>
              </div>

              <div className="flex flex-wrap gap-3">
                {["Sci-Fi", "Drama", "Crime", "Thriller", "Western"].map((genre) => (
                  <div
                    key={genre}
                    className="flex items-center gap-3 rounded-2xl border border-transparent bg-[#141414] p-4 transition-colors hover:border-neutral-600"
                  >
                    <span className="text-sm font-bold text-white">{genre}</span>
                    <ChevronRight size={14} className="text-neutral-600" />
                  </div>
                ))}
              </div>

              {/* Review Section (Now Curated for Admins) */}
              <div className="mt-12 rounded-2xl border-2 border-dashed border-neutral-800 bg-[#141414]/50 p-8 text-center">
                <p className="text-sm text-neutral-500 italic">
                  {isAdmin 
                    ? "Admin Mode: You can now see reported reviews and community flags in the curation panel." 
                    : "You haven't written any public reviews yet. Your insights could help others find their next favorite story!"}
                </p>
                <button className="text-accent mt-4 text-xs font-bold tracking-widest uppercase hover:underline">
                  {isAdmin ? "Open Curation Queue" : "Write your first review"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}