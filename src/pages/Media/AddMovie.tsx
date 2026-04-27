import { 
  Upload,  
  Star, 
  Calendar, 
  Clock, 
  Globe, 
  Tag, 
  PlusCircle, 
  Type,
  FileText
} from "lucide-react";

export default function AddMovie() {
  return (
    <div className="bg-main-bg min-h-screen p-6 md:p-12">
      <div className="mx-auto max-w-6xl">
        
        {/* Header Section */}
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-white">
              Add <span className="text-accent">New Media</span>
            </h1>
            <p className="mt-2 text-sm text-neutral-500">
              Manually populate the database with custom cinematic entries.
            </p>
          </div>
          <button className="bg-accent text-light-bg flex cursor-pointer items-center gap-2 rounded-xl px-8 py-3 text-sm font-bold transition-all hover:brightness-110 active:scale-95 shadow-[0_0_20px_rgba(180,244,77,0.2)]">
            <PlusCircle size={20} strokeWidth={2.5} />
            Publish Media
          </button>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          
          {/* Left Column: Image Upload */}
          <div className="lg:col-span-4">
            <div className="bg-light-bg sticky top-12 rounded-3xl border border-neutral-800/50 p-6 shadow-2xl">
              <h3 className="mb-6 text-xs font-extrabold tracking-widest text-neutral-500 uppercase">
                Media Poster
              </h3>
              
              <div className="group relative flex aspect-2/3 w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-800 bg-[#141414] transition-all hover:border-accent/50 hover:bg-accent/5">
                <div className="flex flex-col items-center text-center p-6">
                  <div className="bg-neutral-800 group-hover:bg-accent/20 mb-4 flex h-16 w-16 items-center justify-center rounded-full transition-colors">
                    <Upload size={32} className="text-neutral-500 group-hover:text-accent" />
                  </div>
                  <p className="text-sm font-bold text-white">Click or Drag to upload</p>
                  <p className="mt-2 text-xs text-neutral-500">
                    SVG, PNG, JPG or GIF <br /> (Recommended: 600x900px)
                  </p>
                </div>
                <input type="file" className="absolute inset-0 cursor-pointer opacity-0" />
              </div>

              <div className="mt-6 space-y-4">
                <div className="rounded-xl bg-[#141414] p-4 border border-neutral-800">
                  <p className="text-[10px] font-bold text-neutral-500 uppercase mb-2">External Poster URL</p>
                  <input 
                    type="text" 
                    placeholder="https://image.tmdb.org/..." 
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-neutral-700"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Data Fields */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Section 1: Basic Information */}
            <div className="bg-light-bg rounded-3xl border border-neutral-800/50 p-8 shadow-2xl">
              <div className="mb-8 flex items-center gap-3">
                <Type className="text-accent" size={20} />
                <h3 className="text-sm font-extrabold tracking-widest text-white uppercase">Basic Information</h3>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase ml-1">Title</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Inception" 
                    className="w-full rounded-xl border border-neutral-700 bg-[#141414] p-3 text-white transition-colors outline-none focus:border-accent"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase ml-1">Year</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" size={16} />
                    <input 
                      type="number" 
                      placeholder="2010" 
                      className="w-full rounded-xl border border-neutral-700 bg-[#141414] p-3 pl-10 text-white outline-none focus:border-accent"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase ml-1">Runtime (min)</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" size={16} />
                    <input 
                      type="number" 
                      placeholder="148" 
                      className="w-full rounded-xl border border-neutral-700 bg-[#141414] p-3 pl-10 text-white outline-none focus:border-accent"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase ml-1">IMDb Rating</label>
                  <div className="relative">
                    <Star className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" size={16} />
                    <input 
                      type="text" 
                      placeholder="8.8" 
                      className="w-full rounded-xl border border-neutral-700 bg-[#141414] p-3 pl-10 text-white outline-none focus:border-accent"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Content & Details */}
            <div className="bg-light-bg rounded-3xl border border-neutral-800/50 p-8 shadow-2xl">
              <div className="mb-8 flex items-center gap-3">
                <FileText className="text-accent" size={20} />
                <h3 className="text-sm font-extrabold tracking-widest text-white uppercase">Content & Plot</h3>
              </div>

              <div className="space-y-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase ml-1">Genres (comma separated)</label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" size={16} />
                    <input 
                      type="text" 
                      placeholder="Action, Sci-Fi, Adventure" 
                      className="w-full rounded-xl border border-neutral-700 bg-[#141414] p-3 pl-10 text-white outline-none focus:border-accent"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase ml-1">Summary / Plot</label>
                  <textarea 
                    placeholder="A thief who steals corporate secrets through the use of dream-sharing technology..." 
                    className="min-h-32 w-full resize-none rounded-xl border border-neutral-700 bg-[#141414] p-4 text-white outline-none focus:border-accent"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Cast & Production */}
            <div className="bg-light-bg rounded-3xl border border-neutral-800/50 p-8 shadow-2xl">
              <div className="mb-8 flex items-center gap-3">
                <Globe className="text-accent" size={20} />
                <h3 className="text-sm font-extrabold tracking-widest text-white uppercase">Cast & Crew</h3>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase ml-1">Director</label>
                  <input 
                    type="text" 
                    placeholder="Christopher Nolan" 
                    className="w-full rounded-xl border border-neutral-700 bg-[#141414] p-3 text-white outline-none focus:border-accent"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase ml-1">Country</label>
                  <input 
                    type="text" 
                    placeholder="USA, UK" 
                    className="w-full rounded-xl border border-neutral-700 bg-[#141414] p-3 text-white outline-none focus:border-accent"
                  />
                </div>
                <div className="md:col-span-2 flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase ml-1">Lead Actors</label>
                  <input 
                    type="text" 
                    placeholder="Leonardo DiCaprio, Joseph Gordon-Levitt, Elliot Page" 
                    className="w-full rounded-xl border border-neutral-700 bg-[#141414] p-3 text-white outline-none focus:border-accent"
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}