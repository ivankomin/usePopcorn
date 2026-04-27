import { 
  ShieldAlert, 
  Check, 
  Trash2, 
  Flag, 
  User, 
  MessageSquare, 
  Filter, 
  AlertTriangle,
  ExternalLink,
  ThumbsUp,
  Star
} from "lucide-react";

export default function CurateReviews() {
  // Mock Data for community reviews
  const reviews = [
    {
      id: 1,
      user: "Skyler_Blue",
      mediaTitle: "Breaking Bad",
      rating: 10,
      status: "Reported",
      reason: "Potential Spoilers",
      content: "I can't believe the ending! When Walt goes back to Albuquerque and uses the machine gun in the trunk, it was absolutely peak television.",
      date: "2 hours ago"
    },
    {
      id: 2,
      user: "CinemaFan99",
      mediaTitle: "Inception",
      rating: 9,
      status: "Pending",
      reason: null,
      content: "The sound design in this movie is incredible. I've watched it 5 times and I still find new details in the dream layers. Highly recommend for any Nolan fan.",
      date: "5 hours ago"
    },
    {
      id: 3,
      user: "TrollHunter_88",
      mediaTitle: "Fight Club",
      rating: 1,
      status: "Flagged",
      reason: "Toxic Behavior",
      content: "First rule of fight club is you don't talk about fight club. This movie is overrated and the community is even worse. Waste of time.",
      date: "1 day ago"
    }
  ];

  return (
    <div className="bg-main-bg min-h-screen p-6 md:p-12">
      <div className="mx-auto max-w-5xl">
        
        {/* Header section */}
        <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="flex items-center gap-3 text-accent mb-2">
              <ShieldAlert size={20} />
              <span className="text-xs font-black uppercase tracking-widest">Admin Control Panel</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white md:text-5xl">
              Review <span className="text-accent">Curation</span>
            </h1>
            <p className="mt-2 text-sm text-neutral-500">
              Moderating {reviews.length} community submissions awaiting approval.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-light-bg flex items-center gap-2 rounded-xl border border-neutral-800 px-4 py-2.5 text-sm font-bold text-neutral-400">
              <Filter size={16} />
              Sort by: <span className="text-white">Most Recent</span>
            </div>
          </div>
        </div>

        {/* Review Feed */}
        <div className="space-y-6">
          {reviews.map((review) => (
            <div 
              key={review.id} 
              className={`bg-light-bg rounded-3xl border p-8 shadow-2xl transition-all ${
                review.status === 'Reported' ? 'border-red-500/20' : 'border-neutral-800/50'
              }`}
            >
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                
                {/* Review Content Area */}
                <div className="flex-1">
                  <div className="mb-4 flex flex-wrap items-center gap-3">
                    <div className="bg-neutral-800 flex h-10 w-10 items-center justify-center rounded-full border border-neutral-700">
                      <User size={20} className="text-neutral-400" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white">{review.user}</h4>
                      <p className="text-xs text-neutral-500">reviewed <span className="text-neutral-300 underline cursor-pointer">{review.mediaTitle}</span> • {review.date}</p>
                    </div>
                    <div className="ml-2 flex items-center gap-1 rounded-lg bg-[#141414] px-2 py-1 border border-neutral-800">
                      <span className="text-accent text-sm font-black">{review.rating}</span>
                      <Star size={12} className="text-accent fill-accent" />
                    </div>

                    {/* Dynamic Status Badge */}
                    <span className={`ml-auto px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      review.status === 'Reported' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 
                      review.status === 'Flagged' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 
                      'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                    }`}>
                      {review.status}
                    </span>
                  </div>

                  <div className="bg-[#141414] rounded-2xl p-5 border border-neutral-800/50 relative">
                    {review.reason && (
                      <div className="mb-3 flex items-center gap-2 text-red-400 text-[10px] font-bold uppercase tracking-wider">
                        <AlertTriangle size={12} />
                        Flag Reason: {review.reason}
                      </div>
                    )}
                    <p className="text-neutral-300 leading-relaxed italic">
                      "{review.content}"
                    </p>
                  </div>
                </div>

                {/* Admin Toolkit (Side Actions) */}
                <div className="flex flex-row gap-2 lg:w-48 lg:flex-col lg:gap-3">
                  <button className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-accent/10 border border-accent/20 py-3 text-sm font-bold text-accent transition-all hover:bg-accent hover:text-light-bg">
                    <Check size={18} strokeWidth={3} />
                    Approve
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#141414] border border-neutral-700 py-3 text-sm font-bold text-white transition-all hover:border-yellow-500/50 hover:text-yellow-500">
                    <Flag size={18} />
                    Warn
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#141414] border border-neutral-700 py-3 text-sm font-bold text-red-500 transition-all hover:bg-red-500/10">
                    <Trash2 size={18} />
                    Delete
                  </button>
                </div>

              </div>

              {/* Bottom Metadata bar */}
              <div className="mt-6 pt-6 border-t border-neutral-800/50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-neutral-500 text-xs">
                    <ThumbsUp size={14} />
                    <span>24 Likes</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-neutral-500 text-xs">
                    <MessageSquare size={14} />
                    <span>3 Replies</span>
                  </div>
                </div>
                <button className="text-neutral-500 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest">
                  View full context
                  <ExternalLink size={14} />
                </button>
              </div>

            </div>
          ))}
        </div>

      </div>
    </div>
  );
}